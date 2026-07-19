<!-- Generated: 2026-07-16 | Files scanned: ~15 database files | Token estimate: ~570 -->
# Data Architecture

## SQLite
[server/db/src/client.ts](../../server/db/src/client.ts) opens `DB_PATH` (default `./data/jobs.db`), enables WAL and foreign keys, then wraps it with Drizzle.

```text
jobs 1 ─────< applications
  └──────────── scraper pipeline (no FK)
```

## Tables
- `jobs`: identity/display fields, `source`, optional `job_id`, URLs, posted/scraped timestamps, `hidden`. Unique partial URL index and `(source, job_id)` index.
- `applications`: `job_id` FK to jobs with cascade delete, five statuses (`wishlist`, `applied`, `interview`, `offered`, `rejected`), notes/timestamps. One application per job.
- `scraper_logs`: source, success/error, error message, scraped count, timestamp; indexed by source/time.

## Data access
- `queries/jobs.ts`: insert, existence/dedup lookups, filtering/pagination, hide/delete.
- `queries/applications.ts`: tracking, joins, updates/deletes.
- `queries/scraper.ts`: status/log history.
- `queries/analytics.ts` + `analytics-calculation.ts`: summaries, funnel, weekly trends, source effectiveness.

## Migration/seed
- `migrate.ts`: idempotent table/column/index creation and legacy dedup cleanup.
- `seed.ts`: five sample jobs, applications, and scraper log; skips when populated.

No auto-delete; CSV export is the backup path. Raw SQL is limited to SQLite migration and aggregate expressions.
