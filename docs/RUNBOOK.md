# Runbook

<!-- AUTO-GENERATED -->
_Source: `package.json`, `.env.example`, Vite configuration, Express server/routes, and SQLite project configuration._

## Scope

Local-only application. No cloud deployment, authentication, alerting service, container files, or compiled backend start command exists.

## Start procedure

1. Install dependencies and prepare database:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

2. Copy `.env.example` to `.env`; keep `HOST=127.0.0.1` for localhost-only access.
3. Start frontend and API:

   ```bash
   npm run dev:all
   ```

4. Start scheduled scraper in separate terminal only when needed:

   ```bash
   npm run dev:scraper
   ```

5. Verify health:

   ```bash
   curl http://127.0.0.1:3001/api/health
   ```

   Expected JSON: `{"success":true,"data":{"status":"ok"}}`.

Production-like frontend preview:

```bash
npm run build
npm run preview
```

This previews frontend only. API still requires `npm run dev:api` because no compiled API start script exists.

## Health and monitoring

| Check | Endpoint / command | Healthy signal |
|---|---|---|
| API process | `GET /api/health` | HTTP 200 and `data.status` equals `ok`. |
| Scraper runtime | `GET /api/scraper/status` | HTTP 200; inspect `isRunning`, `portals`, `engine`, and `pythonTool`. |
| Scraper history | `GET /api/scraper/logs?limit=50` | HTTP 200; limit is clamped to 1-100. |
| Frontend | `http://localhost:5173` | Vite page loads and API requests succeed. |
| Database | `npm run db:migrate` | Migration exits successfully. |

No automated alert channel exists. Operator checks endpoints and process output manually.

## API endpoint reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Report API health. |
| `GET` | `/api/jobs` | List visible, untracked jobs with filters and pagination. |
| `POST` | `/api/jobs/:id/hide` | Hide job from feed. |
| `POST` | `/api/jobs/:id/unhide` | Restore hidden job. |
| `POST` | `/api/jobs/:id/track` | Create wishlist or applied application. |
| `GET` | `/api/applications` | List tracked applications with filters. |
| `PATCH` | `/api/applications/:id` | Update application status or notes. |
| `DELETE` | `/api/applications/:id` | Delete one application. |
| `DELETE` | `/api/applications?status=…` | Delete applications in one valid status. |
| `GET` | `/api/analytics` | Return aggregate analytics, optionally by date range. |
| `POST` | `/api/export` | Download filtered applications as CSV. |
| `GET` | `/api/scraper/status` | Report scraper runtime and per-portal status. |
| `GET` | `/api/scraper/logs` | List persisted scraper logs. |
| `POST` | `/api/scraper/run` | Trigger asynchronous scrape. |

## Manual scraper operation

Run all configured sources:

```bash
npm run scrape:once
```

Trigger asynchronously through API:

```bash
curl -X POST http://127.0.0.1:3001/api/scraper/run \
  -H "Content-Type: application/json" \
  -d '{}'
```

Request accepts optional `source`, `sources`, `keywords`, `engine`, and `pythonTool`. Valid sources: `jobstreet`, `linkedin`, `kalibrr`, `glints`, `dealls`. HTTP 202 means accepted, not completed; poll `/api/scraper/status` and `/api/scraper/logs`.

## Common issues

| Symptom | Check | Fix |
|---|---|---|
| API connection refused | API process and port 3001 | Run `npm run dev:api`; resolve port conflict or change `PORT`. |
| Frontend API failures | `VITE_API_URL`, API health | Use `http://localhost:3001/api` or Vite `/api` proxy; restart Vite after env changes. |
| Empty feed | Database contents, scraper logs | Run `npm run db:seed` for sample data or `npm run scrape:once`. |
| `SQLITE_BUSY` / locked database | Duplicate API or scraper processes | Stop duplicate writers; retry after process exits. SQLite WAL handles normal concurrent reads. |
| Puppeteer cannot find browser | Puppeteer install, Chrome paths | Reinstall dependencies with browser download enabled, or set `PUPPETEER_EXECUTABLE_PATH` / `CHROME_PATH`. |
| Hybrid scraper timeout | Python executable and packages | Verify `PYTHON_EXECUTABLE`, install `server/scraper/experiments/requirements.txt`, or increase `SCRAPER_PYTHON_TIMEOUT_MS`. |
| Scraper returns 503 | `/api/scraper/status` shows running | Wait for active run; do not start overlapping run. |
| Build or type errors | Local validation commands | Run `npm run typecheck`, `npm run lint`, then `npm run build`; fix first reported error. |

## Backup and rollback

No automatic deployment rollback exists. Preserve SQLite data before migrations or operational changes. Stop API and scraper processes before copying SQLite files so database, WAL, and shared-memory files stay consistent.

PowerShell backup:

```powershell
$stamp = Get-Date -Format yyyyMMdd-HHmmss
Copy-Item ./data/jobs.db "./data/jobs-backup-$stamp.db"
Copy-Item ./data/jobs.db-wal "./data/jobs-backup-$stamp.db-wal" -ErrorAction SilentlyContinue
Copy-Item ./data/jobs.db-shm "./data/jobs-backup-$stamp.db-shm" -ErrorAction SilentlyContinue
```

Restore procedure:

1. Stop API and scraper processes.
2. Preserve current database under a new filename.
3. Copy chosen backup to path configured by `DB_PATH`.
4. Run `npm run db:migrate` to apply forward-compatible migrations.
5. Start API and verify `/api/health`, job feed, and tracker data.

Code rollback uses version control outside this runbook; rebuild frontend and restart API/scraper after restoring known-good source.

## Escalation

Single-user local project. No formal escalation path exists. Preserve database and scraper logs, record failing command plus timestamp, then inspect relevant process:

- API/frontend failures: `npm run dev:all`
- Scheduler/scraper failures: `npm run dev:scraper` and `/api/scraper/logs`
- Database failures: stop writers, back up `data/jobs.db*`, then rerun migration

<!-- /AUTO-GENERATED -->
