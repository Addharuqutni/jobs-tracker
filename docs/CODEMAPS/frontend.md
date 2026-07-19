<!-- Generated: 2026-07-16 | Updated: 2026-07-19 | Files scanned: ~50 frontend files | Token estimate: ~680 -->
# Frontend Architecture

## Page tree
`App → ToastProvider → Suspense → Layout → Outlet`

Routes:
- `/dashboard` → scraper controls, portal status/history.
- `/feed` → filters, pagination, job actions.
- `/tracker` → drag-and-drop five-column Kanban.
- `/analytics` → charts and CSV export (charts lazy-loaded as one chunk).
- `/cv-review` → CV upload and AI result.

## Components
- `layout/`: `Layout`, `Sidebar`, `Header`.
- `job/`: `JobCard`, `JobFilter`, `Pagination`.
- `tracker/`: `KanbanColumn`, `KanbanCard`, `JobDetailModal`.
- `scraper/`: controls, portal selection/status, history.
- `charts/`: Recharts visualizations and stat cards (lazy `ChartsSection`).
- `cv/`: upload and review result.
- `ui/`: Button, Card, Modal, Toast, States, SourceBadge.

## State/data flow
```text
page → hook → src/lib/api.ts (HTTP)            for scraper queue, CV review
         └─ src/lib/idb.ts (IndexedDB)         for jobs/applications/logs (source of truth)
         └─ src/lib/scraperRunStore.ts         singleton run state (useSyncExternalStore)
```

- Scraper run: single poll interval app-wide via `scraperRunStore`; `useScraperRun` is a thin `useSyncExternalStore` wrapper.
- Cross-hook refresh: `storageEvents.ts` dispatches `jobs-storage-changed` with `{ stores: ['jobs'|'applications'|'logs'] }`; hooks subscribe with debounce 120ms and filter by store.
- Portal status baseline: `idb.getPortalStatusFromLogs` (latest log per source); live `run.result.portals` overlays via `mergeScraperStatus`.

Hooks include `useJobs`, `useApplications` (optimistic tracker updates), `useAnalytics` (+ `useScraperStatus`), `useScraperDashboard`, `useScraperEngine`, keyword/source localStorage selections, and `useCvReview`.

## Key files
- [src/App.tsx](../../src/App.tsx): routes and lazy loading.
- `src/lib/api.ts`: typed fetch wrappers and FormData CV upload.
- `src/lib/idb.ts`: IndexedDB open, merge/CRUD, analytics aggregation, export.
- `src/lib/scraperIngest.ts`: `ingestRunResult` (idempotent per runId), active-run-id session storage.
- `src/lib/scraperRunStore.ts`: singleton run state, one poll loop, `start`/`clear`/`refetch`.
- `src/lib/storageEvents.ts`: `notifyStorageChanged` + `onStorageChanged` (filter + debounce).
- `src/utils/mergeScraperStatus.ts`: overlay live run onto cached status.
- `src/types/index.ts`, `src/constants/index.ts`: frontend contracts.
