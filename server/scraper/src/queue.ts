import { randomUUID } from 'node:crypto';
import type {
  PythonScraperTool,
  ScraperEngine,
  ScraperRunResult,
  ScraperRunStatus,
} from '../../shared/src';
import { Orchestrator } from './core/orchestrator';

export interface ScraperJobParams {
  sources?: string[];
  keywords?: string[];
  engine?: ScraperEngine;
  pythonTool?: PythonScraperTool;
}

export interface ScraperJob {
  runId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: ScraperRunStatus;
  params: ScraperJobParams;
  errorMessage?: string;
  result?: ScraperRunResult;
}

export interface ScraperJobView {
  runId: string;
  status: ScraperRunStatus;
  position: number | null;
  queueLength: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  result: ScraperRunResult | null;
  params: ScraperJobParams;
}

export interface QueueSnapshot {
  concurrency: number;
  queueMax: number;
  queueLength: number;
  activeCount: number;
  isRunning: boolean;
  activeRunIds: string[];
}

function envInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class ScraperQueue {
  private readonly orchestrator: Orchestrator;
  private readonly concurrency: number;
  private readonly queueMax: number;
  private readonly resultTtlMs: number;
  private readonly maxFinished: number;

  private queue: ScraperJob[] = [];
  private active = new Map<string, ScraperJob>();
  private finished = new Map<string, ScraperJob>();
  private pumping = false;

  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator;
    this.concurrency = envInt('SCRAPER_CONCURRENCY', 1);
    this.queueMax = envInt('SCRAPER_QUEUE_MAX', 10);
    this.resultTtlMs = envInt('SCRAPER_RESULT_TTL_MS', 900_000);
    this.maxFinished = envInt('SCRAPER_RESULT_MAX', 50);
  }

  enqueue(params: ScraperJobParams): { job: ScraperJobView } | { error: 'QUEUE_FULL'; queueLength: number } {
    this.evictExpired();
    if (this.queue.length >= this.queueMax) {
      return { error: 'QUEUE_FULL', queueLength: this.queue.length };
    }

    const job: ScraperJob = {
      runId: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'queued',
      params,
    };
    this.queue.push(job);
    void this.pump();
    return { job: this.toView(job) };
  }

  getRun(runId: string): ScraperJobView | null {
    this.evictExpired();
    const job =
      this.active.get(runId) ??
      this.queue.find((item) => item.runId === runId) ??
      this.finished.get(runId);
    return job ? this.toView(job) : null;
  }

  snapshot(): QueueSnapshot {
    this.evictExpired();
    return {
      concurrency: this.concurrency,
      queueMax: this.queueMax,
      queueLength: this.queue.length,
      activeCount: this.active.size,
      isRunning: this.active.size > 0,
      activeRunIds: [...this.active.keys()],
    };
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.active.size < this.concurrency && this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) break;
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        this.active.set(job.runId, job);
        void this.execute(job);
      }
    } finally {
      this.pumping = false;
    }
  }

  private async execute(job: ScraperJob): Promise<void> {
    try {
      const result = await this.orchestrator.run(job.params.sources, job.params.keywords, {
        engine: job.params.engine,
        pythonTool: job.params.pythonTool,
      });
      if (!result) {
        job.status = 'failed';
        job.errorMessage = 'Scraper skipped (already running)';
      } else {
        job.status = 'succeeded';
        job.result = result;
      }
    } catch (err) {
      job.status = 'failed';
      job.errorMessage = err instanceof Error ? err.message : 'Unknown scraper error';
      console.error(`[queue] run ${job.runId} failed:`, job.errorMessage);
    } finally {
      job.finishedAt = new Date().toISOString();
      this.active.delete(job.runId);
      this.finished.set(job.runId, job);
      this.trimFinished();
      void this.pump();
    }
  }

  private queuePosition(runId: string): number | null {
    const index = this.queue.findIndex((job) => job.runId === runId);
    return index >= 0 ? index + 1 : null;
  }

  private toView(job: ScraperJob): ScraperJobView {
    return {
      runId: job.runId,
      status: job.status,
      position: job.status === 'queued' ? this.queuePosition(job.runId) : null,
      queueLength: this.queue.length,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? null,
      finishedAt: job.finishedAt ?? null,
      errorMessage: job.errorMessage ?? null,
      result: job.result ?? null,
      params: job.params,
    };
  }

  private evictExpired(): void {
    if (this.resultTtlMs <= 0) return;
    const cutoff = Date.now() - this.resultTtlMs;
    for (const [runId, job] of this.finished) {
      const finishedAt = job.finishedAt ? Date.parse(job.finishedAt) : NaN;
      if (!Number.isNaN(finishedAt) && finishedAt < cutoff) {
        this.finished.delete(runId);
      }
    }
  }

  private trimFinished(): void {
    while (this.finished.size > this.maxFinished) {
      const oldest = this.finished.keys().next().value;
      if (oldest === undefined) break;
      this.finished.delete(oldest);
    }
  }
}
