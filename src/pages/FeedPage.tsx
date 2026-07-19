import { useState, useCallback } from 'react';
import { Inbox, RefreshCw, Trash2 } from 'lucide-react';
import type { Job } from '../types';
import { useJobs } from '../hooks/useJobs';
import { useScraperKeywords } from '../hooks/useScraperKeywords';
import { useScraperSources } from '../hooks/useScraperSources';
import { useScraperEngine } from '../hooks/useScraperEngine';
import * as idb from '../lib/idb';
import { getUserMessage } from '../lib/errors';
import { useScraperRun } from '../hooks/useScraperRun';
import { useToast } from '../components/ui/Toast';
import { JobFilter } from '../components/job/JobFilter';
import { JobCard } from '../components/job/JobCard';
import { Pagination } from '../components/job/Pagination';
import { LoadingCard, EmptyState, ErrorState } from '../components/ui/States';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export function FeedPage() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'newest' | 'title' | 'company'>('newest');
  const { show } = useToast();
  const [triggering, setTriggering] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { keywords } = useScraperKeywords();
  const { selectedSources, toggleSource } = useScraperSources();
  const { engine, pythonTool } = useScraperEngine();
  const { start: startScraper } = useScraperRun();

  const { jobs, pagination, loading, error, refetch } = useJobs({
    keyword: keyword || undefined,
    location: location || undefined,
    source: selectedSources.length > 0 ? selectedSources.join(',') : undefined,
    page,
    pageSize: 10,
    sort,
  });

  const handleSourceToggle = useCallback(
    (source: string) => {
      toggleSource(source as Job['source']);
      setPage(1);
    },
    [toggleSource],
  );

  const handleLamar = useCallback(
    async (job: Job) => {
      try {
        await idb.trackJob(job.id, 'applied');
        show('Moved to Applied');
        refetch();
      } catch (err) {
        show(getUserMessage(err), 'error');
      }
    },
    [show, refetch],
  );

  const handleWishlist = useCallback(
    async (job: Job) => {
      try {
        await idb.trackJob(job.id, 'wishlist');
        show('Added to Wishlist');
        refetch();
      } catch (err) {
        show(getUserMessage(err), 'error');
      }
    },
    [show, refetch],
  );

  const handleAbaikan = useCallback(
    async (job: Job) => {
      try {
        await idb.hideJob(job.id);
        show('Job hidden', 'info', {
          label: 'Undo',
          onClick: () => {
            idb
              .unhideJob(job.id)
              .then(() => {
                show('Job restored');
                refetch();
              })
              .catch((err: unknown) => show(getUserMessage(err), 'error'));
          },
        });
        refetch();
      } catch (err) {
        show(getUserMessage(err), 'error');
      }
    },
    [show, refetch],
  );

  async function handleRunScraper() {
    setTriggering(true);
    try {
      const enqueued = await startScraper({
        keywords: keywords.length > 0 ? keywords : undefined,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        engine,
        pythonTool,
      });
      if (enqueued?.status === 'queued' && enqueued.position) {
        show(`Queued #${enqueued.position}`);
      } else {
        show('Scraper started');
      }
    } catch (err) {
      show(getUserMessage(err), 'error');
    } finally {
      setTriggering(false);
    }
  }

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      const { deleted } = await idb.deleteAllJobs();
      show(`${deleted} job${deleted !== 1 ? 's' : ''} deleted`);
      setDeleteOpen(false);
      refetch();
    } catch (err) {
      show(getUserMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell max-w-none">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            Discovery
          </p>
          <h1 className="page-heading">
            Job Feed
            {pagination && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {pagination.total} jobs
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            disabled={!pagination || pagination.total === 0}
          >
            <Trash2 size={14} />
            Delete All
          </Button>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      <JobFilter
        keyword={keyword}
        location={location}
        selectedSources={selectedSources}
        sort={sort}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onLocationChange={(v) => {
          setLocation(v);
          setPage(1);
        }}
        onSourceToggle={handleSourceToggle}
        onSortChange={(value) => {
          setSort(value);
          setPage(1);
        }}
      />

      {loading ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Loading jobs</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Inbox size={48} />}
          title="No jobs found"
          description="Try adjusting your filters or run the scraper to get new jobs."
          action={
            <Button variant="primary" onClick={handleRunScraper} disabled={triggering}>
              {triggering ? 'Starting...' : 'Run Scraper Now'}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onLamar={handleLamar}
                onWishlist={handleWishlist}
                onAbaikan={handleAbaikan}
              />
            ))}
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete all jobs">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-300">
            Permanently delete <span className="font-medium text-slate-100">all jobs</span> and
            associated applications? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
