import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import type { CvReviewMode, Job, JobSource } from '../../../shared/src';
import { chatJson, isAiConfigured } from '../lib/ai-client';
import { CV_MAX_BYTES, isSupportedCvMime, parseCv } from '../lib/cv-parser';
import { buildCvReviewMessages, parseCvReviewResponse } from '../lib/cv-review-prompt';

export const cvRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CV_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, isSupportedCvMime(file.mimetype));
  },
});

const uploadCv: RequestHandler = (req, res, next) => {
  upload.single('cv')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'CV file exceeds the 5MB limit.' : 'Invalid file upload.';
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message } });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
};

const JOB_SOURCES: JobSource[] = ['jobstreet', 'linkedin', 'kalibrr', 'glints', 'dealls'];

function parseJobPayload(raw: unknown): Job | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.id !== 'number' || !Number.isFinite(o.id)) return null;
  if (typeof o.source !== 'string' || !JOB_SOURCES.includes(o.source as JobSource)) return null;
  return {
    id: o.id,
    title: typeof o.title === 'string' ? o.title : null,
    company: typeof o.company === 'string' ? o.company : null,
    location: typeof o.location === 'string' ? o.location : null,
    url: typeof o.url === 'string' ? o.url : null,
    salary: typeof o.salary === 'string' ? o.salary : null,
    source: o.source as JobSource,
    jobId: typeof o.jobId === 'string' ? o.jobId : null,
    postedAt: typeof o.postedAt === 'string' ? o.postedAt : null,
    scrapedAt: typeof o.scrapedAt === 'string' ? o.scrapedAt : new Date().toISOString(),
    hidden: 0,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
  };
}

cvRouter.post('/cv/review', uploadCv, (req, res) => {
  void (async () => {
    if (!isAiConfigured()) {
      res.status(503).json({ success: false, error: { code: 'AI_UNAVAILABLE', message: 'AI provider is not configured. Set AI_API_KEY.' } });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'CV file is required (PDF, DOCX, or TXT, max 5MB).' } });
      return;
    }

    let mode: CvReviewMode = 'general';
    let job: Job | null = null;
    const rawJob = typeof req.body?.job === 'string' ? req.body.job : undefined;
    if (rawJob !== undefined && rawJob !== '') {
      job = parseJobPayload(rawJob);
      if (!job) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'job must be a valid job JSON object.' } });
        return;
      }
      mode = 'match';
    }

    let cvText: string;
    try {
      cvText = await parseCv(file.buffer, file.mimetype);
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Failed to parse CV.' } });
      return;
    }

    try {
      const raw = await chatJson(buildCvReviewMessages(cvText, job));
      const review = parseCvReviewResponse(raw, mode, job);
      res.json({ success: true, data: review });
    } catch (error) {
      res.status(502).json({ success: false, error: { code: 'AI_ERROR', message: error instanceof Error ? error.message : 'AI review failed.' } });
    }
  })();
});
