import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/request-logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { scraperRouter } from './routes/scraper.routes';
import { cvRouter } from './routes/cv.routes';

export function createServer(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.use('/api', scraperRouter);
  app.use('/api', cvRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use(notFoundHandler);
  app.use(errorHandler as unknown as express.ErrorRequestHandler);

  return app;
}
