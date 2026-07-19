import { Router } from 'express';
import { getJobs, hideJob, unhideJob, trackJob, applicationExistsForJob, deleteAllJobs } from '../../../db/src';
import { optionalQueryString, parseJobSources, parsePositiveId, parseSort } from '../lib/validation';

export const jobsRouter = Router();

jobsRouter.get('/jobs', (req, res) => {
  const pageValue = req.query.page ?? '1';
  const pageSizeValue = req.query.pageSize ?? '20';
  if (typeof pageValue !== 'string' || !/^\d+$/.test(pageValue) || Number(pageValue) < 1
    || typeof pageSizeValue !== 'string' || !/^\d+$/.test(pageSizeValue)
    || Number(pageSizeValue) < 1 || Number(pageSizeValue) > 100) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'page must be >= 1 and pageSize must be 1-100' },
    });
    return;
  }
  const page = Number(pageValue);
  const pageSize = Number(pageSizeValue);
  let keyword: string | undefined;
  let location: string | undefined;
  let source: ReturnType<typeof parseJobSources>;
  let sort: ReturnType<typeof parseSort>;
  try {
    keyword = optionalQueryString(req.query.keyword, 'keyword');
    location = optionalQueryString(req.query.location, 'location');
    source = parseJobSources(req.query.source);
    sort = parseSort(req.query.sort);
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid query' } });
    return;
  }

  const sourceParam = source?.join(',');
  const result = getJobs({ page, pageSize, keyword, location, source: sourceParam, sort });

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

jobsRouter.post('/jobs/:id/hide', (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (id === undefined) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid job ID' },
    });
    return;
  }

  if (!hideJob(id)) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Job not found' },
    });
    return;
  }
  res.json({ success: true, data: null });
});

jobsRouter.post('/jobs/:id/unhide', (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (id === undefined) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid job ID' } });
    return;
  }
  if (!unhideJob(id)) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
    return;
  }
  res.json({ success: true, data: null });
});

jobsRouter.delete('/jobs', (_req, res) => {
  const count = deleteAllJobs();
  res.json({ success: true, data: { deleted: count } });
});

jobsRouter.post('/jobs/:id/track', (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (id === undefined) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid job ID' },
    });
    return;
  }

  const status = req.body?.status as 'wishlist' | 'applied' | undefined;
  if (!status || !['wishlist', 'applied'].includes(status)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Status must be wishlist or applied' },
    });
    return;
  }

  if (applicationExistsForJob(id)) {
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Job already tracked' },
    });
    return;
  }

  let application;
  try {
    application = trackJob(id, status);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Job already tracked' } });
      return;
    }
    throw error;
  }
  if (!application) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Job not found' },
    });
    return;
  }
  res.status(201).json({ success: true, data: application });
});
