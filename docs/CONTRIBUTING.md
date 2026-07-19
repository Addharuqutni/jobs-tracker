# Contributing

<!-- AUTO-GENERATED -->
_Source: `package.json`, `.env.example`, `.eslintrc.cjs`, `.prettierrc`, and discovered test files._

## Development setup

Prerequisites:

- Node.js 20+
- npm 10+
- Chromium installed by Puppeteer during `npm install`
- Python plus packages from `server/scraper/experiments/requirements.txt` only for hybrid scraper experiments

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev:all
```

Copy `.env.example` to `.env` before changing local defaults. API runs at `http://127.0.0.1:3001`; Vite runs at `http://localhost:5173`.

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite frontend development server. |
| `npm run dev:api` | Start Express API in watch mode. |
| `npm run dev:all` | Start API and frontend concurrently. |
| `npm run dev:scraper` | Start scraper scheduler process. |
| `npm run build` | Type-check project references, then build frontend. |
| `npm run preview` | Preview production frontend build. |
| `npm run lint` | Lint TypeScript and JavaScript under `src/` and `server/`. |
| `npm run format` | Format `src/` and `server/` with Prettier. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test` | Run discovered Node tests through `tsx --test`. |
| `npm run test:coverage` | Run scoped c8 coverage with 35% per-file gates. |
| `npm run scrape` | Run scraper CLI. |
| `npm run scrape:once` | Run one complete scrape. |
| `npm run scrape:experiment` | Run Python scraper benchmark using project virtual environment. |
| `npm run scrape:experiment:jobstreet` | Benchmark one JobStreet page for `react developer`. |
| `npm run scrape:experiment:linkedin` | Benchmark one LinkedIn page for `react developer`. |
| `npm run db:migrate` | Apply idempotent SQLite migration. |
| `npm run db:seed` | Seed development database. |

## Environment variables

All entries are optional because code supplies defaults. Values shown match `.env.example`; three scraper tuning entries are currently templates only and are not read by source code.

| Variable | Required | Format / valid values | Purpose | Example |
|---|---|---|---|---|
| `PORT` | No | TCP port integer | Express API port. | `3001` |
| `HOST` | No | Bind host or IP | Express bind address. | `127.0.0.1` |
| `DB_PATH` | No | File path | SQLite database path. | `./data/jobs.db` |
| `SCRAPER_CRON` | No | Five-field cron | Scheduler expression. | `0 */6 * * *` |
| `SCRAPER_DELAY_MIN_MS` | No | Positive integer | Reserved template; adapters currently define delays in source. | `1000` |
| `SCRAPER_DELAY_MAX_MS` | No | Positive integer | Reserved template; adapters currently define delays in source. | `5000` |
| `SCRAPER_MAX_PAGES` | No | Positive integer | Reserved template; adapters currently define page limits in source. | `5` |
| `SCRAPER_ENGINE` | No | `native`, `hybrid` | Default scraper engine. | `hybrid` |
| `SCRAPER_PYTHON_TOOL` | No | `auto`, `beautifulsoup`, `scrapy`, `selenium`, `playwright` | Hybrid sidecar implementation. | `auto` |
| `SCRAPER_PYTHON_TIMEOUT_MS` | No | Positive integer milliseconds | Python sidecar timeout. | `120000` |
| `PYTHON_EXECUTABLE` | No | Executable path | Python used by hybrid sidecar. | `./server/scraper/experiments/.venv/Scripts/python.exe` |
| `VITE_API_URL` | No | Absolute or relative URL | Frontend API base URL. | `http://localhost:3001/api` |
| `LOG_LEVEL` | No | String | API log level configuration. | `info` |

## Testing

Tests use `node:test` with `tsx`; coverage uses c8. Co-locate TypeScript tests as `*.test.ts`. Python experiment tests use pytest.

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run build

cd server/scraper/experiments
python -m pytest test_scraper.py -v
```

New non-trivial logic needs one focused runnable test. Scraper parsers should use sanitized fixtures under `server/scraper/tests/fixtures/`; avoid live network requests in normal test runs.

## Code style

- TypeScript strict mode; named exports only.
- ESLint: `npm run lint`.
- Prettier: `npm run format`.
- Two-space indentation, single quotes, semicolons, 100-column print width.
- No pre-commit hook is configured; run checks manually.

## Pull request checklist

- [ ] Change is minimal and scoped.
- [ ] Tests cover new non-trivial behavior.
- [ ] `npm test` passes.
- [ ] `npm run test:coverage` passes when covered modules change.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] No secrets, local database files, or generated coverage/build artifacts are included.
- [ ] Documentation matches changed commands, environment variables, or endpoints.

<!-- /AUTO-GENERATED -->
