import { sqlite } from './client';

function columnExists(table: string, column: string): boolean {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function migrate(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT,
      company     TEXT,
      location    TEXT,
      url         TEXT,
      salary      TEXT,
      source      TEXT NOT NULL,
      job_id      TEXT,
      scraped_at  TEXT NOT NULL DEFAULT (datetime('now')),
      hidden      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
    CREATE INDEX IF NOT EXISTS idx_jobs_hidden ON jobs(hidden);
    CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs(scraped_at DESC);
    CREATE TABLE IF NOT EXISTS applications (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id            INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      status            TEXT NOT NULL DEFAULT 'wishlist'
                        CHECK(status IN ('wishlist','applied','interview','rejected','offered')),
      notes             TEXT DEFAULT '',
      applied_at        TEXT,
      status_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_status_updated_at ON applications(status_updated_at DESC);

    CREATE TABLE IF NOT EXISTS scraper_logs (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      source              TEXT NOT NULL,
      status              TEXT NOT NULL CHECK(status IN ('success','error')),
      error_message       TEXT,
      jobs_scraped_count  INTEGER NOT NULL DEFAULT 0,
      timestamp           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_scraper_logs_source_timestamp ON scraper_logs(source, timestamp DESC);
  `);

  if (!columnExists('jobs', 'posted_at')) {
    sqlite.exec(`ALTER TABLE jobs ADD COLUMN posted_at TEXT`);
    console.log('[db] Added posted_at column to jobs table');
  }
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);`);

  sqlite.transaction(() => {
    sqlite.exec(`
      DELETE FROM applications
      WHERE id NOT IN (SELECT MIN(id) FROM applications GROUP BY job_id);
      DROP INDEX IF EXISTS idx_applications_job_id;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_job_id_unique ON applications(job_id);

      UPDATE applications
      SET job_id = (
        SELECT MIN(keep.id) FROM jobs keep
        WHERE keep.source = (SELECT duplicate.source FROM jobs duplicate WHERE duplicate.id = applications.job_id)
          AND keep.job_id = (SELECT duplicate.job_id FROM jobs duplicate WHERE duplicate.id = applications.job_id)
      )
      WHERE job_id IN (SELECT id FROM jobs WHERE job_id IS NOT NULL AND job_id <> '');
      DELETE FROM jobs
      WHERE job_id IS NOT NULL AND job_id <> ''
        AND id NOT IN (
          SELECT MIN(id) FROM jobs WHERE job_id IS NOT NULL AND job_id <> '' GROUP BY source, job_id
        );
      UPDATE applications
      SET job_id = (SELECT MIN(keep.id) FROM jobs keep WHERE keep.url = (SELECT duplicate.url FROM jobs duplicate WHERE duplicate.id = applications.job_id))
      WHERE job_id IN (SELECT id FROM jobs WHERE url IS NOT NULL);
      DELETE FROM jobs
      WHERE url IS NOT NULL
        AND id NOT IN (SELECT MIN(id) FROM jobs WHERE url IS NOT NULL GROUP BY url);
      DROP INDEX IF EXISTS idx_jobs_url;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_job_id
        ON jobs(source, job_id) WHERE job_id IS NOT NULL AND job_id <> '';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_url_unique ON jobs(url) WHERE url IS NOT NULL;
    `);
  })();

  console.log('[db] Migration complete — all tables and indexes created');
}

migrate();
