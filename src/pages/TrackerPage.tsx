import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { Application, ApplicationStatus } from '../types';
import { KANBAN_COLUMN_ORDER, STATUS_LABELS } from '../constants';
import { useApplications } from '../hooks/useApplications';
import { getUserMessage } from '../lib/errors';
import { useToast } from '../components/ui/Toast';
import { KanbanColumn } from '../components/tracker/KanbanColumn';
import { JobDetailModal } from '../components/tracker/JobDetailModal';
import { LoadingCard, EmptyState, ErrorState } from '../components/ui/States';
import { CalendarDays, KanbanSquare, Search, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SOURCES, SOURCE_LABELS } from '../constants';
import type { JobSource } from '../types';

export function TrackerPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const {
    applications,
    loading,
    error,
    refetch,
    updateStatus,
    updateNotes,
    deleteApplication,
    deleteByStatus,
  } = useApplications({
    keyword: keyword || undefined,
    source: source || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const { show } = useToast();
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<ApplicationStatus | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, Application[]> = {
      wishlist: [],
      applied: [],
      interview: [],
      rejected: [],
      offered: [],
    };
    for (const app of applications) {
      if (map[app.status]) map[app.status].push(app);
    }
    return map;
  }, [applications]);
  const selectedApp = applications.find((app) => app.id === selectedAppId) ?? null;

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as ApplicationStatus;
    const appId = Number(result.draggableId);
    try {
      await updateStatus(appId, newStatus);
      show(`Moved to ${newStatus}`);
    } catch (err) {
      show(getUserMessage(err), 'error');
      refetch();
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteApplication(id);
      show('Application deleted');
    } catch (err) {
      show(getUserMessage(err), 'error');
    }
  }

  async function handleBulkDelete() {
    if (!bulkDeleteStatus) return;
    setBulkDeleting(true);
    try {
      const count = await deleteByStatus(bulkDeleteStatus);
      show(
        `Deleted ${count} application${count !== 1 ? 's' : ''} from ${STATUS_LABELS[bulkDeleteStatus]}`,
      );
      setBulkDeleteStatus(null);
    } catch (err) {
      show(getUserMessage(err), 'error');
    } finally {
      setBulkDeleting(false);
    }
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="page-shell max-w-none">
        <span className="sr-only">Loading application tracker</span>
        <div>
          <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            Pipeline
          </p>
          <h1 className="page-heading">Application Tracker</h1>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {KANBAN_COLUMN_ORDER.map((_: ApplicationStatus, i: number) => (
            <div key={i} className="min-w-[260px] flex-1">
              <LoadingCard />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell max-w-none">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  const filtersActive = Boolean(keyword || source || from || to);
  if (applications.length === 0 && !filtersActive) {
    return (
      <div className="page-shell max-w-none">
        <div>
          <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            Pipeline
          </p>
          <h1 className="page-heading">Application Tracker</h1>
        </div>
        <EmptyState
          icon={<KanbanSquare size={48} />}
          title="No applications yet"
          description="Start tracking jobs from the feed to see them here."
          action={
            <Button variant="primary" onClick={() => navigate('/feed')}>
              Go to Job Feed
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            Pipeline
          </p>
          <h1 className="page-heading">
            Application Tracker
            <span className="ml-2 text-sm font-normal text-slate-400">
              {applications.length} total
            </span>
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBulkDeleteStatus('rejected')}
          disabled={grouped.rejected.length === 0}
        >
          <Trash2 size={14} />
          Clear Rejected
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 border-2 border-slate-50 bg-white p-4 shadow-artistic sm:grid-cols-2 xl:grid-cols-12">
        <label className="xl:col-span-4">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Search
          </span>
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Title or company"
              className="control-focus min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500"
            />
          </span>
        </label>
        <label className="xl:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Source
          </span>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="control-focus min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
          >
            <option value="">All sources</option>
            {SOURCES.map((item: JobSource) => (
              <option key={item} value={item}>
                {SOURCE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="xl:col-span-3">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            From
          </span>
          <span className="relative block">
            <CalendarDays
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
              className="control-focus min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-200"
            />
          </span>
        </label>
        <label className="xl:col-span-3">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Through
          </span>
          <span className="relative block">
            <CalendarDays
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className="control-focus min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-200"
            />
          </span>
        </label>
      </div>
      {applications.length === 0 ? (
        <EmptyState
          icon={<Search size={42} />}
          title="No matching applications"
          description="Adjust or clear filters to see more applications."
          action={
            <Button
              variant="ghost"
              onClick={() => {
                setKeyword('');
                setSource('');
                setFrom('');
                setTo('');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div
              className="control-focus flex snap-x snap-proximity gap-4 overflow-x-auto pb-4"
              role="region"
              // Scrollable Kanban needs focus so keyboard users can reach off-screen columns.
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              aria-label="Application status board. Scroll horizontally for more columns."
            >
              {KANBAN_COLUMN_ORDER.map((status: ApplicationStatus) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  applications={grouped[status] ?? []}
                  onCardClick={(app) => setSelectedAppId(app.id)}
                  onClearColumn={(s) => setBulkDeleteStatus(s)}
                />
              ))}
            </div>
          </DragDropContext>
          <p className="text-center text-xs text-slate-400">
            Drag cards between columns, or press Space and use arrow keys. Open a card to change
            status without dragging.
          </p>
        </>
      )}
      <JobDetailModal
        application={selectedApp}
        onClose={() => setSelectedAppId(null)}
        onUpdateStatus={updateStatus}
        onUpdateNotes={updateNotes}
        onDelete={handleDelete}
      />

      <Modal
        open={bulkDeleteStatus !== null}
        onClose={() => setBulkDeleteStatus(null)}
        title="Delete applications"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-300">
            Delete all {bulkDeleteStatus ? (grouped[bulkDeleteStatus]?.length ?? 0) : 0} application
            {(bulkDeleteStatus ? (grouped[bulkDeleteStatus]?.length ?? 0) : 0) !== 1
              ? 's'
              : ''} in{' '}
            <span className="font-medium text-slate-100">
              {bulkDeleteStatus ? STATUS_LABELS[bulkDeleteStatus] : ''}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setBulkDeleteStatus(null)}>
              Cancel
            </Button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {bulkDeleting ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
