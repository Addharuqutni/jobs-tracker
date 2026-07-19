import { Router } from 'express';
import { getApplications } from '../../../db/src';
import { isRecord, parseDate, parseStatuses, validateDateRange } from '../lib/validation';

export const exportRouter = Router();

exportRouter.post('/export', (req, res) => {
  const body: unknown = req.body ?? {};
  if (!isRecord(body)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Body must be an object' } });
    return;
  }
  let statuses;
  let from;
  let to;
  try {
    statuses = parseStatuses(body.status);
    from = parseDate(body.from, 'from');
    to = parseDate(body.to, 'to');
    validateDateRange(from, to);
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid export filters' } });
    return;
  }

  const applications = getApplications({ statuses, from, to });

  const csvLines: string[] = [];
  csvLines.push('id,title,company,location,url,salary,source,posted_at,status,notes,applied_at,status_updated_at,created_at');

  for (const app of applications) {
    const job = app.job;
    const row = [
      app.id,
      csvEscape(job?.title ?? ''),
      csvEscape(job?.company ?? ''),
      csvEscape(job?.location ?? ''),
      csvEscape(job?.url ?? ''),
      csvEscape(job?.salary ?? ''),
      csvEscape(job?.source ?? ''),
      csvEscape(job?.postedAt ?? ''),
      csvEscape(app.status),
      csvEscape(app.notes ?? ''),
      csvEscape(app.appliedAt ?? ''),
      csvEscape(app.statusUpdatedAt),
      csvEscape(app.createdAt),
    ];
    csvLines.push(row.join(','));
  }

  const csv = csvLines.join('\n');
  const filename = `applications-export-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
