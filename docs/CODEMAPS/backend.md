<!-- Generated: 2026-07-16 | Files scanned: ~55 backend files | Token estimate: ~760 -->
# Backend Architecture

## Middleware
`cors → express.json → requestLogger → routers → notFoundHandler → errorHandler`

## Routes
- `GET /api/health` → inline health response.
- `GET /api/jobs` → `validation` → `queries/jobs.getJobs`; hide/unhide/track actions mutate jobs/applications.
- `GET /api/applications` → `queries/applications.getApplications`; PATCH/DELETE update tracker state.
- `GET /api/analytics` → `queries/analytics.getAnalytics` → funnel/trend calculations.
- `POST /api/export` → application query → CSV stream.
- `GET /api/scraper/status`, `POST /api/scraper/run`, `GET /api/scraper/logs` → scraper runtime/log queries.
- `POST /api/cv/review` → multer memory upload → `cv-parser` → `cv-review-prompt` → `ai-client`.

## Key files
- [server/api/src/server.ts](../../server/api/src/server.ts): Express assembly.
- `server/api/src/routes/*.routes.ts`: thin route handlers; no service layer.
- `server/api/src/lib/validation.ts`: boundary validation.
- [server/db/src/client.ts](../../server/db/src/client.ts): SQLite/Drizzle client.
- `server/db/src/queries/*.ts`: data access.
- [server/scraper/src/core/orchestrator.ts](../../server/scraper/src/core/orchestrator.ts): sequential scraping, timeout, logging.
- `server/scraper/src/adapters/*.adapter.ts`: five portal adapters.

## Scraper flow
`Orchestrator → native adapter OR Python sidecar (hybrid) → dedupEngine → insertJob + insertScraperLog`.
Adapters isolate errors; orchestrator guards concurrent runs and closes Puppeteer resources.

## External dependencies
Express/CORS, multer, Drizzle + better-sqlite3, Cheerio, Puppeteer, node-cron, pdf-parse, mammoth, OpenAI-compatible HTTP API.
