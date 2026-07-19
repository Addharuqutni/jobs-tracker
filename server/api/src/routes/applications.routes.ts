import { Router } from 'express';
import { getApplications, updateApplication, deleteApplication, deleteApplicationsByStatus } from '../../../db/src';
import type { ApplicationStatus } from '../../../shared/src';
import { isRecord, optionalQueryString, parseDate, parseJobSource, parsePositiveId, parseStatuses, validateDateRange } from '../lib/validation';

export const applicationsRouter = Router();

applicationsRouter.get('/applications', (req, res) => {
  let statuses: ApplicationStatus[] | undefined;
  let source: ReturnType<typeof parseJobSource>;
  let keyword: string | undefined;
  let from: string | undefined;
  let to: string | undefined;
  try {
    statuses = parseStatuses(req.query.status);
    source = parseJobSource(req.query.source);
    keyword = optionalQueryString(req.query.keyword, 'keyword');
    from = parseDate(req.query.from, 'from');
    to = parseDate(req.query.to, 'to');
    validateDateRange(from, to);
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid query' } });
    return;
  }

  const data = getApplications({ statuses, source, keyword, from, to });
  res.json({ success: true, data });
});

applicationsRouter.patch('/applications/:id', (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (id === undefined) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid application ID' },
    });
    return;
  }

  const body: unknown = req.body;
  if (!isRecord(body)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Body must be an object' } });
    return;
  }
  const validStatuses: ApplicationStatus[] = ['wishlist', 'applied', 'interview', 'rejected', 'offered'];

  if (body.status !== undefined && (typeof body.status !== 'string' || !validStatuses.includes(body.status as ApplicationStatus))) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid status' },
    });
    return;
  }

  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 5000)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'notes must be a string with at most 5000 characters' } });
    return;
  }

  if (!body.status && body.notes === undefined) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'At least one field required' },
    });
    return;
  }

  const updated = updateApplication(id, {
    status: body.status as ApplicationStatus | undefined,
    notes: body.notes as string | undefined,
  });

  if (!updated) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Application not found' },
    });
    return;
  }

  res.json({ success: true, data: updated });
});

applicationsRouter.delete('/applications/:id', (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (id === undefined) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid application ID' },
    });
    return;
  }

  const deleted = deleteApplication(id);
  if (!deleted) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Application not found' },
    });
    return;
  }

  res.json({ success: true, data: null });
});

applicationsRouter.delete('/applications', (req, res) => {
  const status = req.query.status as string | undefined;
  const validStatuses: ApplicationStatus[] = ['wishlist', 'applied', 'interview', 'rejected', 'offered'];

  if (!status || !validStatuses.includes(status as ApplicationStatus)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Valid status query parameter required' },
    });
    return;
  }

  const count = deleteApplicationsByStatus(status as ApplicationStatus);
  res.json({ success: true, data: { deleted: count } });
});
