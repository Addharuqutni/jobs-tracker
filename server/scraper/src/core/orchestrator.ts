import type {
  AdapterResult,
  JobSource,
  PythonScraperTool,
  ScrapedJob,
  ScraperEngine,
  ScraperRunResult,
  ScraperStatus,
} from '../../../shared/src';
import { BaseAdapter } from '../adapters/base';
import { JobStreetAdapter } from '../adapters/jobstreet.adapter';
import { LinkedInAdapter } from '../adapters/linkedin.adapter';
import { KalibrrAdapter } from '../adapters/kalibrr.adapter';
import { GlintsAdapter } from '../adapters/glints.adapter';
import { DeallsAdapter } from '../adapters/dealls.adapter';
import { dedupEngine } from './dedup';
import { closeBrowser } from '../utils/puppeteer-pool';
import { runPythonSidecar } from '../sidecar/python-sidecar';
import { TimeoutError, withTimeout } from '../utils/timeout';

interface RunOptions {
  engine?: ScraperEngine;
  pythonTool?: PythonScraperTool;
}

function parseAdapterTimeout(): number {
  const parsed = Number(process.env.SCRAPER_ADAPTER_TIMEOUT_MS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 90_000;
}

export class Orchestrator {
  private adapters: BaseAdapter[];
  private isRunning = false;

  constructor() {
    this.adapters = [
      new JobStreetAdapter(),
      new LinkedInAdapter(),
      new KalibrrAdapter(),
      new GlintsAdapter(),
      new DeallsAdapter(),
    ];
  }

  async run(
    sources?: string[],
    keywords?: string[],
    options: RunOptions = {},
  ): Promise<ScraperRunResult | null> {
    if (this.isRunning) {
      console.log('[scraper] Already running, skipping...');
      return null;
    }

    this.isRunning = true;
    const collectedJobs: ScrapedJob[] = [];
    const logs: ScraperRunResult['logs'] = [];
    const portals: ScraperStatus[] = [];

    try {
      console.log(`[scraper] Run started at ${new Date().toISOString()}`);

      const normalizedSources = [
        ...new Set(sources?.map((source) => source.trim().toLowerCase()).filter(Boolean)),
      ];
      const adapters =
        normalizedSources.length > 0
          ? this.adapters.filter((adapter) => normalizedSources.includes(adapter.source))
          : this.adapters;

      const normalizedKeywords = [
        ...new Set(keywords?.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean)),
      ];
      const keywordList: Array<string | undefined> =
        normalizedKeywords.length > 0 ? normalizedKeywords : [undefined];
      const engine = options.engine ?? parseEngine(process.env.SCRAPER_ENGINE);
      const pythonTool = options.pythonTool ?? parseTool(process.env.SCRAPER_PYTHON_TOOL);
      const adapterTimeoutMs = parseAdapterTimeout();

      for (const adapter of adapters) {
        console.log(`[scraper] Running adapter: ${adapter.source}`);

        let adapterJobs = 0;
        let adapterError: string | null = null;
        const adapterCollected: ScrapedJob[] = [];

        const adapterKeywords =
          adapter.source === 'dealls' && normalizedKeywords.length > 0
            ? [normalizedKeywords.join('\u0000')]
            : keywordList;
        for (const [index, keyword] of adapterKeywords.entries()) {
          try {
            let result: AdapterResult;
            if (engine === 'hybrid') {
              const sidecar = await withTimeout(
                runPythonSidecar(adapter.source as JobSource, keyword, pythonTool),
                adapterTimeoutMs,
                `${adapter.source} sidecar`,
              );
              if (sidecar.result) {
                result = sidecar.result;
                console.log(`[scraper] ${adapter.source}: Python ${sidecar.tool} engine succeeded`);
              } else {
                console.warn(
                  `[scraper] ${adapter.source}: Python ${sidecar.tool ?? 'sidecar'} unavailable (${sidecar.fallbackReason}); using native engine`,
                );
                result = await withTimeout(
                  adapter.scrape(keyword),
                  adapterTimeoutMs,
                  `${adapter.source} scrape`,
                );
              }
            } else {
              result = await withTimeout(
                adapter.scrape(keyword),
                adapterTimeoutMs,
                `${adapter.source} scrape`,
              );
            }

            if (result.jobs.length > 0) {
              const uniqueJobs = await dedupEngine.filter(result.jobs);
              adapterCollected.push(...uniqueJobs);
              adapterJobs += result.jobsScrapedCount;
              console.log(
                `[scraper] ${adapter.source} [keyword=${keyword ?? 'default'}]: scraped=${result.jobsScrapedCount}, unique=${uniqueJobs.length}`,
              );
            }

            if (result.status === 'error') {
              adapterError = result.errorMessage;
              console.error(
                `[scraper] ${adapter.source} [keyword=${keyword ?? 'default'}] partial error: ${result.errorMessage}`,
              );
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            adapterError = message;
            if (err instanceof TimeoutError) {
              console.error(
                `[scraper] ${adapter.source} [keyword=${keyword ?? 'default'}] timed out: ${message}`,
              );
            } else {
              console.error(`[scraper] ${adapter.source} unexpected error: ${message}`);
            }
          }

          if (index < adapterKeywords.length - 1) {
            await this.delay(1000, 3000);
          }
        }

        // final in-run dedup across keywords for this adapter
        const uniqueAdapterJobs = await dedupEngine.filter(adapterCollected);
        collectedJobs.push(...uniqueAdapterJobs);

        const timestamp = new Date().toISOString();
        logs.push({
          source: adapter.source,
          status: adapterError ? 'error' : 'success',
          errorMessage: adapterError,
          jobsScrapedCount: adapterJobs,
          timestamp,
        });
        portals.push({
          source: adapter.source,
          lastStatus: adapterError ? 'error' : 'success',
          lastRun: timestamp,
          jobsScraped: adapterJobs,
          errorMessage: adapterError,
        });

        await this.delay(2000, 5000);
      }

      console.log(`[scraper] Run completed at ${new Date().toISOString()}`);

      // cross-adapter in-run dedup
      const jobs = await dedupEngine.filter(collectedJobs);
      return {
        finishedAt: new Date().toISOString(),
        jobs,
        logs,
        portals,
      };
    } finally {
      // ponytail: clear the flag FIRST so a hung/failed browser close can never lock the scraper.
      this.isRunning = false;
      try {
        await closeBrowser();
      } catch (err) {
        console.error(
          '[scraper] closeBrowser failed:',
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  getRunning(): boolean {
    return this.isRunning;
  }

  private async delay(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function parseEngine(value: string | undefined): ScraperEngine {
  return value === 'hybrid' ? 'hybrid' : 'native';
}

function parseTool(value: string | undefined): PythonScraperTool {
  return value === 'beautifulsoup' ||
    value === 'scrapy' ||
    value === 'selenium' ||
    value === 'playwright'
    ? value
    : 'auto';
}
