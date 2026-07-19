<!-- Generated: 2026-07-16 | Updated: 2026-07-19 | Files scanned: ~15 database files | Token estimate: ~570 -->
# Data Architecture

## Two stores (single-user, local)
- **Client IndexedDB** (`src/lib/idb.ts`) — source of truth for UI: `jobs`, `applications`, `scraper_logs`.
- **Server SQLite** ([server/db/src/client.ts](../../server/db/src/client.ts), `./data/jobs.db`) — legacy server-side queries; not written by the scraper queue anymore.

### IndexedDB (UI source of truth)
```text
jobs ────< applications
scraper_logs (per source/status/count/timestamp)
```
- `mergeJobs(scraped)`: dedup by URL and `(source, jobId)` before insert.
- `getPortalStatusFromLogs(sources)`: latest log per source → `ScraperStatus[]` (baseline for dashboard/Header).
- `getAnalytics(params)`: aggregates over `applications` + `jobs` for analytics page.
- `exportApplicationsCsv()`: CSV stream from `applications`.

### SQLite (server-side legacy)
WAL, foreign keys on. Tables: `jobs`, `applications`, `scraper_logs` (schema in `server/db/src/schema.ts`). Queries in `server/db/src/queries/*.ts`. Migration/seed via `npm run db:migrate` / `npm run db:seed`.

> Note: the scraper queue returns `ScraperRunResult` in memory and does NOT insert into SQLite; the client ingests results into IndexedDB. SQLite remains for the legacy `/api/jobs`, `/api/applications`, `/api/analytics` routes.

## Deduplication
3-layer in `dedupEngine`: URL match → `(source, jobId)` match → weighted fuzzy (title+company+location ≥90%) via `string-similarity-js`.

## Migration/seed
- `migrate.ts`: idempotent table/column/index creation (SQLite).
- `seed.ts`: sample data; skips when populated.
- IndexedDB schema created lazily in `openDb()` (`idb.ts`); no separate migration.

No auto-delete; CSV export is the backup path for applications.
