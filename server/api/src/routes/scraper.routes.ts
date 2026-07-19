import { Router } from 'express';
import { enqueueScraperRun, getQueueSnapshot, getScraperRun } from '../../../scraper/src/runtime';
import { SOURCES } from '../../../shared/src';
import type { PythonScraperTool, ScraperEngine, ScraperStatus } from '../../../shared/src';

export const scraperRouter = Router();

function emptyPortals(): ScraperStatus[] {
  return SOURCES.map((source) => ({
    source,
    lastStatus: null,
    lastRun: '',
    jobsScraped: 0,
    errorMessage: null,
  }));
}

scraperRouter.get('/scraper/status', (_req, res) => {
  const snap = getQueueSnapshot();

  res.json({
    success: true,
    data: {
      portals: emptyPortals(),
      nextRun: null,
      isRunning: snap.isRunning,
      engine: process.env.SCRAPER_ENGINE === 'hybrid' ? 'hybrid' : 'native',
      pythonTool: process.env.SCRAPER_PYTHON_TOOL ?? 'auto',
      lastRun: null,
      concurrency: snap.concurrency,
      queueMax: snap.queueMax,
      queueLength: snap.queueLength,
      activeCount: snap.activeCount,
      activeRunIds: snap.activeRunIds,
    },
  });
});

scraperRouter.get('/scraper/runs/:runId', (req, res) => {
  const runId = req.params.runId;
  if (!runId || typeof runId !== 'string' || runId.length > 80) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid runId' },
    });
    return;
  }

  const job = getScraperRun(runId);
  if (!job) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Scraper run not found or expired' },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      runId: job.runId,
      status: job.status,
      position: job.position,
      queueLength: job.queueLength,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      errorMessage: job.errorMessage,
      result: job.result,
    },
  });
});

scraperRouter.post('/scraper/run', (req, res) => {
  const body: unknown = req.body ?? {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Body must be an object' } });
    return;
  }

  const input = body as Record<string, unknown>;
  const source = typeof input.source === 'string' ? input.source : undefined;
  const sources = Array.isArray(input.sources) && input.sources.every((item) => typeof item === 'string')
    ? input.sources
    : undefined;
  const keywords = Array.isArray(input.keywords) && input.keywords.every((item) => typeof item === 'string')
    ? input.keywords
    : undefined;
  const engine = input.engine === 'native' || input.engine === 'hybrid'
    ? input.engine as ScraperEngine
    : undefined;
  const pythonTools: PythonScraperTool[] = ['auto', 'beautifulsoup', 'scrapy', 'selenium', 'playwright'];
  const pythonTool = typeof input.pythonTool === 'string' && pythonTools.includes(input.pythonTool as PythonScraperTool)
    ? input.pythonTool as PythonScraperTool
    : undefined;

  if (input.sources !== undefined && !sources) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sources must be a string array' } });
    return;
  }
  if (input.source !== undefined && !source) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'source must be a string' } });
    return;
  }
  if (input.keywords !== undefined && !keywords) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'keywords must be a string array' } });
    return;
  }
  if (input.engine !== undefined && !engine) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'engine must be native or hybrid' } });
    return;
  }
  if (input.pythonTool !== undefined && !pythonTool) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown Python scraper tool' } });
    return;
  }

  const finalSources = sources && sources.length > 0
    ? sources
    : source
      ? [source]
      : undefined;

  if (finalSources?.some((item) => !SOURCES.includes(item as (typeof SOURCES)[number]))) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown scraper source' } });
    return;
  }
  if (keywords && (keywords.length === 0 || keywords.length > 20 || keywords.some((item) => item.trim().length === 0 || item.length > 100))) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide 1-20 non-empty keywords, maximum 100 characters each' } });
    return;
  }

  const enqueued = enqueueScraperRun({
    sources: finalSources,
    keywords,
    engine,
    pythonTool,
  });

  if ('error' in enqueued) {
    res.status(429).json({
      success: false,
      error: {
        code: 'QUEUE_FULL',
        message: `Scraper queue is full (${enqueued.queueLength} waiting). Try again later.`,
      },
    });
    return;
  }

  const triggeredSources = finalSources ?? [...SOURCES];
  const { job } = enqueued;

  res.status(202).json({
    success: true,
    data: {
      runId: job.runId,
      status: job.status,
      position: job.position,
      queueLength: job.queueLength,
      message: job.status === 'queued' ? 'Scraper queued' : 'Scraper started',
      sources: triggeredSources,
    },
  });
});
