<!-- Generated: 2026-07-16 | Files scanned: package.json + integration modules | Token estimate: ~620 -->
# Dependencies & Integrations

## Runtime libraries
- React 18, React Router 6, Vite 5, Tailwind 3.
- `@hello-pangea/dnd` for Kanban; Recharts for analytics; Lucide for icons.
- Express 4 + CORS; multer for in-memory CV uploads.
- better-sqlite3 + Drizzle ORM for SQLite.
- Cheerio for SSR scraping; Puppeteer for blocked/interactive fallback; node-cron for six-hour scheduling.
- pdf-parse and mammoth for CV extraction; string-similarity-js for fuzzy deduplication.

## External portals
Native adapters target JobStreet, LinkedIn, Kalibrr, Glints, and Dealls. Public data only; no portal authentication.

## AI integration
[server/api/src/lib/ai-client.ts](../../server/api/src/lib/ai-client.ts) calls an OpenAI-compatible `/chat/completions` endpoint. Defaults are configurable via `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` (OpenRouter/Gemini default).

## Python sidecar
Hybrid scraping optionally spawns runners under `server/scraper/experiments/.venv`; currently supports JobStreet and LinkedIn. `PYTHON_EXECUTABLE` overrides the interpreter.

## Configuration
`PORT`, `HOST`, `DB_PATH`, `SCRAPER_CRON`, `SCRAPER_ENGINE`, `SCRAPER_PYTHON_TOOL`, `SCRAPER_PYTHON_TIMEOUT_MS`, `VITE_API_URL`, and AI variables are environment-driven. `.env` is loaded by API config.

## Tooling
TypeScript, tsx, ESLint, Prettier, c8, concurrently. Tests use Node `node:test`; Playwright is optional for E2E.
