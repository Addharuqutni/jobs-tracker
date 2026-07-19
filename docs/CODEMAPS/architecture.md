<!-- Generated: 2026-07-16 | Updated: 2026-07-19 | Files scanned: ~110 source files | Token estimate: ~520 -->
# Architecture

Flat single-user React/Express application (not a monorepo). Browser is the source of truth for jobs/applications/logs (IndexedDB); API hosts scraper queue, CV review, and health.

```text
Browser (Vite :5173)
  ├─ IndexedDB (jobs, applications, scraper_logs)  ← UI source of truth
  ├─ scraperRunStore (singleton, useSyncExternalStore)
  └─ HTTP /api ─> Express API (:3001)
                    ├─ scraper queue (runId, concurrency=1, max=10) → adapters/sidecar
                    ├─ CV upload → AI review
                    └─ /health
Scraper CLI / node-cron (separate process) ──────────────────────────┘
```

## Entry points
- Frontend: [src/main.tsx](../../src/main.tsx) → `App`.
- API: [server/api/src/index.ts](../../server/api/src/index.ts) → `createServer`.
- Scraper: [server/scraper/src/index.ts](../../server/scraper/src/index.ts) → CLI/cron.
- DB: [server/db/src/migrate.ts](../../server/db/src/migrate.ts), `seed.ts` (server-side legacy; UI uses IndexedDB).

## Boundaries
- `src/`: UI, local hooks, HTTP client, IndexedDB; no backend imports.
- `server/api/`: HTTP routes, validation, CV/AI integration, scraper queue.
- `server/db/`: schema, migrations, Drizzle query layer (server-side, not used by UI).
- `server/scraper/`: portal adapters, deduplication, scheduling, Python sidecar fallback, queue.
- `server/shared/`: backend shared types/constants/utilities.

## Core flows
- `request → middleware → route validation → response envelope`.
- Scraper: `POST /api/scraper/run` (202) → queue → `Orchestrator → native adapter OR Python sidecar (hybrid) → dedupEngine` → `ScraperRunResult` (held in memory, TTL 15m). Client polls `GET /api/scraper/runs/:runId`.
- Client ingest: run succeeded → `ingestRunResult` → `mergeJobs` + `addScraperLogs` to IndexedDB → `notifyStorageChanged(['jobs','logs'])`.
- CV upload → MIME/size validation → PDF/DOCX/text extraction → OpenAI-compatible AI review.
