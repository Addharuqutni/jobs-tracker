import { Router } from 'express';
import { getAnalytics } from '../../../db/src';
import { parseDate, validateDateRange } from '../lib/validation';

export const analyticsRouter = Router();

analyticsRouter.get('/analytics', (req, res) => {
  let from: string | undefined;
  let to: string | undefined;
  try {
    from = parseDate(req.query.from, 'from');
    to = parseDate(req.query.to, 'to');
    validateDateRange(from, to);
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid date range' } });
    return;
  }

  const data = getAnalytics({ from, to });
  res.json({ success: true, data });
});
