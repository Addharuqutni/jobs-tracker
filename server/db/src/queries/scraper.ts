import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { scraperLogs } from '../schema';
import type { ScraperStatus, ScraperLogEntry } from '../../../shared/src';
import { SOURCES } from '../../../shared/src';

export function insertScraperLog(log: {
  source: string;
  status: 'success' | 'error';
  errorMessage: string | null;
  jobsScrapedCount: number;
}): void {
  // ISO UTC with Z so clients never mis-parse SQLite naive datetime as local.
  db.insert(scraperLogs)
    .values({ ...log, timestamp: new Date().toISOString() })
    .run();
}

export function getScraperStatus(): ScraperStatus[] {
  const results: ScraperStatus[] = [];

  for (const source of SOURCES) {
    const latest = db.select().from(scraperLogs)
      .where(eq(scraperLogs.source, source))
      .orderBy(desc(scraperLogs.timestamp), desc(scraperLogs.id))
      .get();

    if (latest) {
      results.push({
        source: latest.source,
        lastStatus: latest.status as 'success' | 'error',
        lastRun: latest.timestamp,
        jobsScraped: latest.jobsScrapedCount,
        errorMessage: latest.errorMessage,
      });
    } else {
      results.push({
        source,
        lastStatus: 'error',
        lastRun: '',
        jobsScraped: 0,
        errorMessage: 'Never run',
      });
    }
  }

  return results;
}

export function getScraperLogs(limit: number = 50): ScraperLogEntry[] {
  return db.select().from(scraperLogs)
    .orderBy(desc(scraperLogs.timestamp), desc(scraperLogs.id))
    .limit(limit)
    .all() as ScraperLogEntry[];
}
