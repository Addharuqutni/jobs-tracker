/**
 * Live engine comparison per portal.
 * Usage: npx tsx server/scraper/src/compare-engines.ts [--keyword "react developer"]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JobSource, PythonScraperTool, ScrapedJob } from '../../shared/src';
import { JobStreetAdapter } from './adapters/jobstreet.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { KalibrrAdapter } from './adapters/kalibrr.adapter';
import { GlintsAdapter } from './adapters/glints.adapter';
import { DeallsAdapter } from './adapters/dealls.adapter';
import type { BaseAdapter } from './adapters/base';
import { runPythonSidecar } from './sidecar/python-sidecar';
import { closeBrowser } from './utils/puppeteer-pool';
import { withTimeout, TimeoutError } from './utils/timeout';

const SOURCES: JobSource[] = ['jobstreet', 'linkedin', 'kalibrr', 'glints', 'dealls'];
const PYTHON_SOURCES: JobSource[] = ['jobstreet', 'linkedin'];
const PYTHON_TOOLS: Exclude<PythonScraperTool, 'auto'>[] = [
  'beautifulsoup',
  'scrapy',
  'selenium',
  'playwright',
];

interface EngineRow {
  source: JobSource;
  engine: string;
  status: 'success' | 'error' | 'empty';
  durationMs: number;
  jobsScraped: number;
  jobsValid: number;
  uniqueUrls: number;
  completeness: number;
  error: string | null;
  sampleTitles: string[];
}

function adapters(): BaseAdapter[] {
  return [
    new JobStreetAdapter(),
    new LinkedInAdapter(),
    new KalibrrAdapter(),
    new GlintsAdapter(),
    new DeallsAdapter(),
  ];
}

function metrics(jobs: ScrapedJob[]) {
  const fields = ['title', 'company', 'location', 'url'] as const;
  let filled = 0;
  let total = 0;
  for (const job of jobs) {
    for (const f of fields) {
      total += 1;
      if (job[f]) filled += 1;
    }
  }
  const urls = new Set(jobs.map((j) => j.url).filter(Boolean));
  return {
    valid: jobs.filter((j) => j.title && j.url).length,
    uniqueUrls: urls.size,
    completeness: total === 0 ? 0 : Math.round((filled / total) * 1000) / 10,
  };
}

function score(row: EngineRow): number {
  // prefer more valid jobs, then completeness, then speed
  if (row.status === 'error') return -1e9;
  return row.jobsValid * 1000 + row.completeness * 10 - row.durationMs / 1000;
}

async function runNative(adapter: BaseAdapter, keyword: string, timeoutMs: number): Promise<EngineRow> {
  const started = performance.now();
  try {
    const result = await withTimeout(adapter.scrape(keyword), timeoutMs, `${adapter.source} native`);
    const m = metrics(result.jobs);
    const durationMs = Math.round(performance.now() - started);
    if (result.status === 'error' && result.jobs.length === 0) {
      return {
        source: adapter.source as JobSource,
        engine: 'native',
        status: 'error',
        durationMs,
        jobsScraped: 0,
        jobsValid: 0,
        uniqueUrls: 0,
        completeness: 0,
        error: result.errorMessage,
        sampleTitles: [],
      };
    }
    return {
      source: adapter.source as JobSource,
      engine: 'native',
      status: m.valid > 0 ? 'success' : 'empty',
      durationMs,
      jobsScraped: result.jobsScrapedCount,
      jobsValid: m.valid,
      uniqueUrls: m.uniqueUrls,
      completeness: m.completeness,
      error: result.errorMessage,
      sampleTitles: result.jobs.slice(0, 3).map((j) => j.title ?? '(no title)'),
    };
  } catch (err) {
    return {
      source: adapter.source as JobSource,
      engine: 'native',
      status: 'error',
      durationMs: Math.round(performance.now() - started),
      jobsScraped: 0,
      jobsValid: 0,
      uniqueUrls: 0,
      completeness: 0,
      error: err instanceof TimeoutError ? err.message : err instanceof Error ? err.message : String(err),
      sampleTitles: [],
    };
  }
}

async function runPython(
  source: JobSource,
  tool: Exclude<PythonScraperTool, 'auto'>,
  keyword: string,
): Promise<EngineRow> {
  const started = performance.now();
  try {
    const sidecar = await runPythonSidecar(source, keyword, tool);
    const durationMs = Math.round(performance.now() - started);
    if (!sidecar.result) {
      return {
        source,
        engine: `python:${tool}`,
        status: 'error',
        durationMs,
        jobsScraped: 0,
        jobsValid: 0,
        uniqueUrls: 0,
        completeness: 0,
        error: sidecar.fallbackReason,
        sampleTitles: [],
      };
    }
    const m = metrics(sidecar.result.jobs);
    return {
      source,
      engine: `python:${tool}`,
      status: m.valid > 0 ? 'success' : 'empty',
      durationMs,
      jobsScraped: sidecar.result.jobsScrapedCount,
      jobsValid: m.valid,
      uniqueUrls: m.uniqueUrls,
      completeness: m.completeness,
      error: sidecar.result.errorMessage,
      sampleTitles: sidecar.result.jobs.slice(0, 3).map((j) => j.title ?? '(no title)'),
    };
  } catch (err) {
    return {
      source,
      engine: `python:${tool}`,
      status: 'error',
      durationMs: Math.round(performance.now() - started),
      jobsScraped: 0,
      jobsValid: 0,
      uniqueUrls: 0,
      completeness: 0,
      error: err instanceof Error ? err.message : String(err),
      sampleTitles: [],
    };
  }
}

function parseKeyword(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === '--keyword' && args[i + 1]) return args[i + 1] as string;
    if (arg.startsWith('--keyword=')) return arg.slice(10);
  }
  return 'react developer';
}

async function main(): Promise<void> {
  const keyword = parseKeyword();
  const timeoutMs = Number(process.env.SCRAPER_ADAPTER_TIMEOUT_MS) || 90_000;
  const list = adapters();
  const rows: EngineRow[] = [];

  console.log(`[compare] keyword="${keyword}" timeout=${timeoutMs}ms`);
  console.log('[compare] Phase 1: native TypeScript adapters (all portals)\n');

  for (const adapter of list) {
    console.log(`  → native ${adapter.source}...`);
    const row = await runNative(adapter, keyword, timeoutMs);
    rows.push(row);
    console.log(
      `    ${row.status} valid=${row.jobsValid} completeness=${row.completeness}% ${row.durationMs}ms` +
        (row.error ? ` err=${row.error.slice(0, 80)}` : ''),
    );
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('\n[compare] Phase 2: Python sidecar tools (jobstreet, linkedin)\n');
  for (const source of PYTHON_SOURCES) {
    for (const tool of PYTHON_TOOLS) {
      console.log(`  → python:${tool} ${source}...`);
      const row = await runPython(source, tool, keyword);
      rows.push(row);
      console.log(
        `    ${row.status} valid=${row.jobsValid} completeness=${row.completeness}% ${row.durationMs}ms` +
          (row.error ? ` err=${row.error.slice(0, 80)}` : ''),
      );
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const winners: Record<string, EngineRow> = {};
  for (const source of SOURCES) {
    const candidates = rows.filter((r) => r.source === source);
    const best = [...candidates].sort((a, b) => score(b) - score(a))[0];
    if (best) winners[source] = best;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    keyword,
    timeoutMs,
    winners: Object.fromEntries(
      Object.entries(winners).map(([source, row]) => [
        source,
        {
          engine: row.engine,
          status: row.status,
          jobsValid: row.jobsValid,
          completeness: row.completeness,
          durationMs: row.durationMs,
          sampleTitles: row.sampleTitles,
        },
      ]),
    ),
    results: rows,
    recommendation: {
      note: 'Best engine = highest valid jobs, then completeness, then speed. Python only for jobstreet/linkedin.',
      perPortal: Object.fromEntries(
        Object.entries(winners).map(([source, row]) => [
          source,
          row.engine === 'native'
            ? { productionEngine: 'native', pythonTool: null }
            : {
                productionEngine: 'hybrid',
                pythonTool: row.engine.replace('python:', ''),
                fallback: 'native',
              },
        ]),
      ),
    },
  };

  const outDir = resolve('server/scraper/experiments/reports');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `engine-compare-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n========== WINNERS ==========');
  for (const source of SOURCES) {
    const w = winners[source];
    if (!w) continue;
    console.log(
      `${source.padEnd(10)} → ${w.engine.padEnd(18)} valid=${String(w.jobsValid).padStart(3)} ` +
        `comp=${String(w.completeness).padStart(5)}% ${String(w.durationMs).padStart(6)}ms [${w.status}]`,
    );
  }
  console.log(`\nReport: ${outPath}`);

  try {
    await closeBrowser();
  } catch {
    // ignore
  }
}

main().catch(async (err) => {
  console.error(err);
  try {
    await closeBrowser();
  } catch {
    // ignore
  }
  process.exit(1);
});
