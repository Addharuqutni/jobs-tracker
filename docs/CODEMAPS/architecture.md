<!-- Generated: 2026-07-16 | Files scanned: ~110 source files | Token estimate: ~520 -->
# Architecture

Flat single-user React/Express application (not a monorepo). Three runtime processes share SQLite:

```text
Browser (Vite :5173)
  └─ HTTP /api ─> Express API (:3001)
                    ├─ Drizzle queries ─> SQLite ./data/jobs.db
                    └─ scraper runtime singleton ─> adapters/sidecar ─> SQLite
Scraper CLI / node-cron ───────────────────────────────────────────────┘
```

## Entry points
- Frontend: [src/main.tsx](../../src/main.tsx) → `App`.
- API: [server/api/src/index.ts](../../server/api/src/index.ts) → `createServer`.
- Scraper: [server/scraper/src/index.ts](../../server/scraper/src/index.ts) → CLI/cron.
- DB: [server/db/src/migrate.ts](../../server/db/src/migrate.ts), `seed.ts`.

## Boundaries
- `src/`: UI, local hooks, HTTP client; no backend imports.
- `server/api/`: HTTP routes, validation, CV/AI integration.
- `server/db/`: schema, migrations, Drizzle query layer.
- `server/scraper/`: portal adapters, deduplication, scheduling, Python fallback.
- `server/shared/`: backend shared types/constants/utilities.

## Core flows
`request → middleware → route validation → DB query → response envelope`.
`adapter → 3-layer dedup (URL, source+jobId, fuzzy ≥90%) → jobs + scraper_logs`.
`CV upload → MIME/size validation → PDF/DOCX/text extraction → OpenAI-compatible AI review`.
