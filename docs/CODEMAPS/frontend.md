<!-- Generated: 2026-07-16 | Files scanned: ~50 frontend files | Token estimate: ~680 -->
# Frontend Architecture

## Page tree
`App → ToastProvider → Suspense → Layout → Outlet`

Routes:
- `/dashboard` → scraper controls, portal status/history.
- `/feed` → filters, pagination, job actions.
- `/tracker` → drag-and-drop five-column Kanban.
- `/analytics` → charts and CSV export.
- `/cv-review` → CV upload and AI result.

## Components
- `layout/`: `Layout`, `Sidebar`, `Header`.
- `job/`: `JobCard`, `JobFilter`, `Pagination`.
- `tracker/`: `KanbanColumn`, `KanbanCard`, `JobDetailModal`.
- `scraper/`: controls, portal selection/status, history.
- `charts/`: Recharts visualizations and stat cards.
- `cv/`: upload and review result.
- `ui/`: Button, Card, Modal, Toast, States, SourceBadge.

## State/data flow
```text
page → local hook (useState/useEffect) → src/lib/api.ts → HTTP /api
  └─ refetch/polling (scraper status every 3s while running)
```

Hooks include `useJobs`, `useApplications` (optimistic tracker updates), `useAnalytics`, `useScraperDashboard`, `useScraperEngine`, keyword/source localStorage selections, and `useCvReview`. No global state store.

## Key files
- [src/App.tsx](../../src/App.tsx): routes and lazy loading.
- `src/lib/api.ts`: typed fetch wrappers and FormData CV upload.
- `src/types/index.ts`, `src/constants/index.ts`: frontend contracts.
- `src/components/charts/Charts.tsx`: analytics visualization surface.
