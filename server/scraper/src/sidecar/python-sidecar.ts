import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { AdapterResult, JobSource, PythonScraperTool, ScrapedJob } from '../../../shared/src';

const supportedSources: JobSource[] = ['jobstreet', 'linkedin'];
const runnerNames: Record<Exclude<PythonScraperTool, 'auto'>, string> = {
  beautifulsoup: 'beautifulsoup_runner.py',
  scrapy: 'scrapy_runner.py',
  selenium: 'selenium_runner.py',
  playwright: 'playwright_runner.py',
};

interface SidecarPayload {
  tool: string;
  source: string;
  status: 'success' | 'error';
  jobs: ScrapedJob[];
  metrics: { valid: number; unique: number; completeness: number };
  error: string | null;
}

export interface SidecarResult {
  result: AdapterResult | null;
  tool: Exclude<PythonScraperTool, 'auto'> | null;
  fallbackReason: string | null;
}

export async function runPythonSidecar(
  source: JobSource,
  keyword: string | undefined,
  requestedTool: PythonScraperTool,
): Promise<SidecarResult> {
  if (!supportedSources.includes(source)) {
    return {
      result: null,
      tool: null,
      fallbackReason: `${source} is not supported by Python sidecar`,
    };
  }

  const tool = chooseTool(source, requestedTool);
  const experimentDir = resolve('server/scraper/experiments');
  const python = resolvePythonExecutable();
  const runner = resolve(experimentDir, runnerNames[tool]);

  if (!existsSync(python)) {
    return { result: null, tool, fallbackReason: `Python executable not found: ${python}` };
  }
  if (!existsSync(runner)) {
    return { result: null, tool, fallbackReason: `Python runner not found: ${runner}` };
  }

  const timeoutMs = positiveInteger(process.env.SCRAPER_PYTHON_TIMEOUT_MS, 120_000);
  const args = [runner, '--source', source, '--keyword', keyword ?? 'programmer', '--pages', '1'];

  return runSidecarProcess(source, tool, python, args, experimentDir, timeoutMs);
}

async function runSidecarProcess(
  source: JobSource,
  tool: Exclude<PythonScraperTool, 'auto'>,
  python: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<SidecarResult> {
  try {
    const output = await spawnJson(python, args, cwd, timeoutMs);
    const payload = parsePayload(output, source, tool);
    if (payload.status === 'error') {
      return { result: null, tool, fallbackReason: payload.error ?? `${tool} sidecar failed` };
    }
    return {
      result: {
        source,
        status: 'success',
        jobs: payload.jobs,
        errorMessage: null,
        jobsScrapedCount: payload.jobs.length,
      },
      tool,
      fallbackReason: null,
    };
  } catch (error) {
    return {
      result: null,
      tool,
      fallbackReason: error instanceof Error ? error.message : 'Python sidecar failed',
    };
  }
}

export function chooseTool(
  source: JobSource,
  requested: PythonScraperTool,
): Exclude<PythonScraperTool, 'auto'> {
  if (requested !== 'auto') return requested;
  return source === 'linkedin' ? 'beautifulsoup' : 'playwright';
}

function resolvePythonExecutable(): string {
  const configured = process.env.PYTHON_EXECUTABLE;
  return resolve(configured ?? 'server/scraper/experiments/.venv/Scripts/python.exe');
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function spawnJson(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Python sidecar timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python sidecar exited with code ${code}`));
        return;
      }
      const line = stdout
        .split(/\r?\n/)
        .filter((value) => value.trim().startsWith('{'))
        .at(-1);
      if (!line) {
        reject(new Error(stderr.trim() || 'Python sidecar returned no JSON'));
        return;
      }
      resolveOutput(line);
    });
  });
}

export function parsePayload(
  raw: string,
  source: JobSource,
  tool: Exclude<PythonScraperTool, 'auto'>,
): SidecarPayload {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Python sidecar returned invalid payload');
  }
  const payload = value as Partial<SidecarPayload>;
  if (payload.tool !== tool || payload.source !== source || !Array.isArray(payload.jobs)) {
    throw new Error('Python sidecar contract mismatch');
  }
  if (payload.status !== 'success' && payload.status !== 'error') {
    throw new Error('Python sidecar returned invalid status');
  }
  const jobs = payload.jobs
    .filter((job): job is ScrapedJob => isScrapedJob(job, source))
    .map((job) => ({ ...job, postedAt: job.postedAt ?? null }));
  // ponytail: non-empty raw list with zero valid jobs is a contract error, not silent success
  if (payload.status === 'success' && payload.jobs.length > 0 && jobs.length === 0) {
    throw new Error(
      `Python sidecar contract mismatch: ${payload.jobs.length} raw jobs but 0 valid after filtering`,
    );
  }
  return {
    tool,
    source,
    status: payload.status,
    jobs,
    metrics: payload.metrics ?? { valid: jobs.length, unique: jobs.length, completeness: 0 },
    error: typeof payload.error === 'string' ? payload.error : null,
  };
}

function isScrapedJob(value: unknown, source: JobSource): value is ScrapedJob {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const job = value as Partial<ScrapedJob>;
  return (
    job.source === source &&
    typeof job.title === 'string' &&
    typeof job.url === 'string' &&
    job.url.startsWith('https://') &&
    (job.jobId === null || typeof job.jobId === 'string')
  );
}
