# Job Scraper & Application Tracker

Otomatisasi pencarian lowongan kerja dari 5 portal (JobStreet, LinkedIn, Kalibrr, Glints, Dealls) ke satu dasbor terpusat + sistem pelacakan lamaran (mini CRM) dengan Kanban board.

Versi 0.0.1 — personal use, single user, local only.

## Screenshot Project

### Dashboard

![Dashboard](docs/image/qa-dashboard-desktop.png)

### Job Feed

![Job Feed](docs/image/qa-feed-desktop.png)

### Application Tracker

![Application Tracker](docs/image/qa-tracker-desktop.png)

### Analytics

![Analytics](docs/image/qa-analytics-desktop.png)

### CV Review

![CV Review](docs/image/qa-cv-review-desktop.png)

## Fitur

- **Multi-source Scraper** — scrape 5 portal job sekaligus dengan adapter pattern. Cheerio untuk SSR, Puppeteer fallback anti-bot.
- **Deduplikasi 3-layer** — URL match → source+jobId match → weighted fuzzy match (title+company+location ≥90%).
- **Job Feed Dashboard** — filter (keyword, source, lokasi), pagination, aksi Lamar / Abaikan / Wishlist.
- **Kanban Tracker** — drag-and-drop board 5 status: wishlist → applied → interview → offered / rejected.
- **Analytics** — chart agregat (Recharts): distribusi status, tren lamaran, breakdown per source.
- **Export CSV** — export lamaran terfilter ke CSV.
- **Scheduler** — node-cron setiap 6 jam (proses terpisah).

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Drag-and-drop | @hello-pangea/dnd |
| Charts | Recharts |
| Backend | Node.js 20+, Express, TypeScript |
| Scraper | Cheerio (SSR) + Puppeteer (fallback) |
| Scheduler | node-cron |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Testing | node:test via tsx, c8 coverage |

## Struktur Proyek

```
jobs/
├── src/                    # Frontend (React)
│   ├── components/
│   ├── pages/              # Dashboard, Feed, Tracker, Analytics
│   ├── hooks/
│   ├── lib/
│   └── types/
├── server/
│   ├── api/src/            # Express API + routes
│   ├── db/src/             # Drizzle schema, migrasi, queries
│   ├── scraper/src/        # Adapter per portal + orchestrator + dedup
│   └── shared/src/         # Shared types & constants
├── docs/                   # RUNBOOK, CONTRIBUTING
├── data/                   # SQLite database file
└── .env.example
```

## Prasyarat

- Node.js 20+
- npm 10+
- Puppeteer menginstall Chromium saat `npm install`
- Python (opsional, untuk hybrid scraper experiment)

## Instalasi

```bash
npm install
npm run db:migrate
npm run db:seed
```

Salin `.env.example` ke `.env`. Default sudah cukup untuk lokal:

```env
PORT=3001
HOST=127.0.0.1
DB_PATH=./data/jobs.db
SCRAPER_CRON=0 */6 * * *
VITE_API_URL=http://localhost:3001/api
```

## Menjalankan

**Frontend + API bersamaan:**

```bash
npm run dev:all
```

Frontend: http://localhost:5173 — API: http://127.0.0.1:3001

**Scraper scheduler (terminal terpisah):**

```bash
npm run dev:scraper
```

**Scrape sekali:**

```bash
npm run scrape:once
```

**Cek health:**

```bash
curl http://127.0.0.1:3001/api/health
```

## API Endpoints

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/jobs` | List lowongan (filter, pagination) |
| `POST` | `/api/jobs/:id/hide` | Sembunyikan lowongan |
| `POST` | `/api/jobs/:id/unhide` | Pulihkan lowongan |
| `POST` | `/api/jobs/:id/track` | Pindah ke tracker (wishlist/applied) |
| `DELETE` | `/api/jobs` | Hapus semua lowongan + lamaran terkait |
| `GET` | `/api/applications` | List lamaran (for Kanban) |
| `PATCH` | `/api/applications/:id` | Update status/notes |
| `DELETE` | `/api/applications/:id` | Hapus satu lamaran |
| `DELETE` | `/api/applications?status=…` | Hapus lamaran by status |
| `GET` | `/api/analytics` | Data agregat untuk charts |
| `POST` | `/api/export` | Export CSV |
| `GET` | `/api/scraper/status` | Status scraper per portal |
| `GET` | `/api/scraper/logs` | Riwayat scraper |
| `POST` | `/api/scraper/run` | Trigger manual scrape |

## Database

SQLite di `./data/jobs.db`. 3 tabel:

- **jobs** — lowongan hasil scrape (title, company, location, url, salary, source, job_id, posted_at, hidden)
- **applications** — lamaran terlacak (job_id FK, status, notes, applied_at)
- **scraper_logs** — log per scrape run (source, status, error_message, jobs_scraped_count)

PRAGMA: `foreign_keys = ON`, `journal_mode = WAL`. Index pada source, hidden, scraped_at, posted_at, url (unique), source+job_id (unique).

Status lamaran: `wishlist` → `applied` → `interview` → `offered` / `rejected`.

## Testing

```bash
npm test                    # node:test via tsx
npm run test:coverage       # c8 coverage (35% per-file gate)
npm run typecheck           # tsc --noEmit
npm run lint                # ESLint
npm run build               # tsc -b && vite build
```

## Batasan

- No auth — localhost only, bind 127.0.0.1
- No multi-user
- No cloud deployment
- No auto-apply (FR-8, Won't Have di v1)
- No real-time notifications
