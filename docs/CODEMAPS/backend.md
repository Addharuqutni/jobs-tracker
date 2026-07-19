<!-- Generated: 2026-07-16 | Updated: 2026-07-19 | Files scanned: ~55 backend files | Token estimate: ~760 -->
# Backend Architecture

## Middleware
`cors → express.json → requestLogger → routers → notFoundHandler → errorHandler`

## Routes
- `GET /api/health` → inline health response.
- `GET /api/jobs` → `validation` → `queries/jobs.getJobs`; hide/unhide/track actions mutate jobs/applications (server-side legacy; UI uses IndexedDB).
- `GET /api/applications` → `queries/applications.getApplications`; PATCH/DELETE update tracker state.
- `GET /api/analytics` → `queries/analytics.getAnalytics` → funnel/trend calculations.
- `POST /api/export` → application query → CSV stream.
- `GET /api/scraper/status` → queue snapshot; returns `emptyPortals()` (client derives portal status from IndexedDB logs).
- `POST /api/scraper/run` → enqueue (202 + runId) or 429 `QUEUE_FULL`.
- `GET /api/scraper/runs/:runId` → in-memory job view (active/finished, TTL 15m).
- `POST /api/cv/review` → multer memory upload → `cv-parser` → `cv-review-prompt` → `ai-client`.

## Key files
- [server/api/src/server.ts](../../server/api/src/server.ts): Express assembly.
- `server/api/src/routes/*.routes.ts`: thin route handlers; no service layer.
- `server/api/src/lib/validation.ts`: boundary validation.
- [server/scraper/src/queue.ts](../../server/scraper/src/queue.ts): in-memory queue, `concurrency`/`queueMax` from env, result TTL.
- [server/scraper/src/core/orchestrator.ts](../../server/scraper/src/core/orchestrator.ts): sequential scraping, timeout + `closeBrowser` cleanup, logging.
- `server/scraper/src/adapters/*.adapter.ts`: five portal adapters.
- `server/scraper/src/sidecar/python-sidecar.ts`: hybrid Python fallback (JobStreet, LinkedIn only).

## Scraper flow
`POST /api/scraper/run` → `ScraperQueue.enqueue` → `Orchestrator.run` → `native adapter OR Python sidecar (hybrid, supported sources only)` → `dedupEngine` → `ScraperRunResult` (jobs + logs + portals) held in memory.
- Orchestrator guards concurrent runs, applies `SCRAPER_ADAPTER_TIMEOUT_MS` (default 90s) per adapter, and force-closes the Puppeteer browser on timeout.
- Hybrid skips `runPythonSidecar` for unsupported sources (Kalibrr, Glints, Dealls) — direct native.
- Client polls `GET /api/scraper/runs/:runId`, then ingests result into IndexedDB on `succeeded`.

## External dependencies
Express/CORS, multer, Cheerio, Puppeteer, node-cron, pdf-parse, mammoth, OpenAI-compatible HTTP API. (Drizzle + better-sqlite3 remain for server-side legacy queries, not used by UI.)
