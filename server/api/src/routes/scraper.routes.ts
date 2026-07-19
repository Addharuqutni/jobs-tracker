import { Router } from 'express';
import { enqueueScraperRun, getQueueSnapshot, getScraperRun } from '../../../scraper/src/runtime';
import {
  NotFoundError,
  QueueFullError,
  SOURCES,
  ValidationError,
  type PythonScraperTool,
  type ScraperEngine,
  type ScraperStatus,
} from '../../../shared/src';
import { asyncHandler } from '../middleware/error-handler';
import { sendError } from '../lib/http-error';

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

scraperRouter.get(
  '/scraper/runs/:runId',
  asyncHandler(async (req, res) => {
    const runId = req.params.runId;
    if (!runId || typeof runId !== 'string' || runId.length > 80) {
      throw new ValidationError('Invalid runId');
    }

    const job = getScraperRun(runId);
    if (!job) {
      throw new NotFoundError('Scraper run', runId);
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
  }),
);

scraperRouter.post('/scraper/run', (req, res) => {
  const body: unknown = req.body ?? {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    sendError(res, new ValidationError('Body must be an object'));
    return;
  }

  const input = body as Record<string, unknown>;
  const source = typeof input.source === 'string' ? input.source : undefined;
  const sources =
    Array.isArray(input.sources) && input.sources.every((item) => typeof item === 'string')
      ? input.sources
      : undefined;
  const keywords =
    Array.isArray(input.keywords) && input.keywords.every((item) => typeof item === 'string')
      ? input.keywords
      : undefined;
  const engine =
    input.engine === 'native' || input.engine === 'hybrid'
      ? (input.engine as ScraperEngine)
      : undefined;
  const pythonTools: PythonScraperTool[] = [
    'auto',
    'beautifulsoup',
    'scrapy',
    'selenium',
    'playwright',
  ];
  const pythonTool =
    typeof input.pythonTool === 'string' &&
    pythonTools.includes(input.pythonTool as PythonScraperTool)
      ? (input.pythonTool as PythonScraperTool)
      : undefined;

  if (input.sources !== undefined && !sources) {
    sendError(res, new ValidationError('sources must be a string array'));
    return;
  }
  if (input.source !== undefined && !source) {
    sendError(res, new ValidationError('source must be a string'));
    return;
  }
  if (input.keywords !== undefined && !keywords) {
    sendError(res, new ValidationError('keywords must be a string array'));
    return;
  }
  if (input.engine !== undefined && !engine) {
    sendError(res, new ValidationError('engine must be native or hybrid'));
    return;
  }
  if (input.pythonTool !== undefined && !pythonTool) {
    sendError(res, new ValidationError('Unknown Python scraper tool'));
    return;
  }

  const finalSources =
    sources && sources.length > 0 ? sources : source ? [source] : undefined;

  if (finalSources?.some((item) => !SOURCES.includes(item as (typeof SOURCES)[number]))) {
    sendError(res, new ValidationError('Unknown scraper source'));
    return;
  }
  if (
    keywords &&
    (keywords.length === 0 ||
      keywords.length > 20 ||
      keywords.some((item) => item.trim().length === 0 || item.length > 100))
  ) {
    sendError(
      res,
      new ValidationError('Provide 1-20 non-empty keywords, maximum 100 characters each'),
    );
    return;
  }

  const enqueued = enqueueScraperRun({
    sources: finalSources,
    keywords,
    engine,
    pythonTool,
  });

  if ('error' in enqueued) {
    sendError(res, new QueueFullError(enqueued.queueLength));
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
