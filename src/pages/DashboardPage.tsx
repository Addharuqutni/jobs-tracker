import { useState } from 'react';
import { Play, RefreshCw, Clock, Tag, Layers } from 'lucide-react';
import { useScraperDashboard } from '../hooks/useScraperDashboard';
import { useScraperKeywords } from '../hooks/useScraperKeywords';
import { useScraperSources } from '../hooks/useScraperSources';
import { useScraperEngine } from '../hooks/useScraperEngine';
import { getUserMessage } from '../lib/errors';
import { useToast } from '../components/ui/Toast';
import { StatCard } from '../components/charts/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { KeywordInput } from '../components/scraper/KeywordInput';
import { PortalStatusCard } from '../components/scraper/PortalStatusCard';
import { PortalSelection } from '../components/scraper/PortalSelection';
import { ScraperHistoryTable } from '../components/scraper/ScraperHistoryTable';
import { LoadingCard, ErrorState } from '../components/ui/States';
import { SOURCES } from '../constants';
import type { JobSource } from '../types';
import { formatRelativeTime } from '../utils/format';

const CONFIGURED_PORTALS: JobSource[] = ['jobstreet', 'linkedin', 'kalibrr', 'glints', 'dealls'];

export function DashboardPage() {
  const {
    status,
    logs,
    totalJobsScraped,
    lastRunTime,
    loading,
    isRunning,
    isActive,
    queuePosition,
    queueLength,
    runStatus,
    error,
    refetch,
    startRun,
  } = useScraperDashboard();
  const { keywords, addKeyword, removeKeyword } = useScraperKeywords();
  const { selectedSources, toggleSource } = useScraperSources();
  const { engine, pythonTool } = useScraperEngine();
  const { show } = useToast();
  const [triggering, setTriggering] = useState(false);

  async function handleRun() {
    setTriggering(true);
    try {
      const enqueued = await startRun({
        keywords: keywords.length > 0 ? keywords : undefined,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        engine,
        pythonTool,
      });
      if (enqueued?.status === 'queued' && enqueued.position) {
        show(`Queued at position #${enqueued.position} (${enqueued.queueLength} waiting)`);
      } else {
        show(
          keywords.length > 0
            ? `Scraper started with ${keywords.length} keyword${keywords.length > 1 ? 's' : ''}`
            : 'Scraper started',
        );
      }
      refetch();
    } catch (err) {
      show(getUserMessage(err), 'error');
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="page-shell max-w-none">
        <span className="sr-only">Loading scraper dashboard</span>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={i === 0 ? 'md:col-span-5' : i === 1 ? 'md:col-span-3' : 'md:col-span-4'}
            >
              <LoadingCard />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  const portals = status?.portals ?? [];

  return (
    <div className="page-shell max-w-none">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 inline-block bg-purple-500 px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
            Operations
          </p>
          <h1 className="page-heading">Scraper Dashboard</h1>
          {(isActive || (queueLength ?? 0) > 0) && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
              <Clock size={14} />
              {runStatus === 'queued' && queuePosition
                ? `Your run queued #${queuePosition} · queue ${queueLength}`
                : runStatus === 'running'
                  ? 'Your run is scraping...'
                  : `Queue length: ${queueLength}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw
              size={14}
              className={isActive ? 'animate-spin motion-reduce:animate-none' : ''}
            />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={triggering}
          >
            <Play size={14} />
            {triggering
              ? 'Queueing...'
              : isActive
                ? 'Queue another'
                : 'Run Scraper Now'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-5">
          <StatCard
            label="Total Jobs Scraped"
            value={totalJobsScraped}
            subtitle="across all portals"
            icon={<Layers size={18} />}
          />
        </div>
        <div className="md:col-span-3">
          <StatCard
            label="Unique Keywords"
            value={keywords.length}
            subtitle={
              keywords.length > 0
                ? keywords.slice(0, 3).join(', ') + (keywords.length > 3 ? '...' : '')
                : 'No keywords set'
            }
            icon={<Tag size={18} />}
          />
        </div>
        <div className="md:col-span-4">
          <StatCard
            label="Last Run"
            value={lastRunTime ? formatRelativeTime(lastRunTime) : 'Never'}
            subtitle={
              runStatus === 'queued'
                ? queuePosition
                  ? `Queued #${queuePosition}`
                  : 'Queued...'
                : isActive || isRunning
                  ? 'Currently running...'
                  : portals.some((p) => p.lastStatus === 'error')
                    ? 'Some portals failed'
                    : portals.some((p) => p.lastStatus === 'success')
                      ? 'All portals OK'
                      : 'Not run yet'
            }
            icon={<Clock size={18} />}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Portal Status</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
          {SOURCES.map((source) => {
            const portal = portals.find((p) => p.source === source);
            const configured = CONFIGURED_PORTALS.includes(source);
            return (
              <PortalStatusCard
                key={source}
                portal={
                  portal ?? {
                    source,
                    lastStatus: null,
                    lastRun: '',
                    jobsScraped: 0,
                    errorMessage: null,
                  }
                }
                configured={configured}
              />
            );
          })}
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Scraper Keywords</h2>
          {keywords.length > 0 && (
            <span className="text-xs text-slate-500">
              {keywords.length} keyword{keywords.length > 1 ? 's' : ''} set
            </span>
          )}
        </div>
        <KeywordInput keywords={keywords} onAdd={addKeyword} onRemove={removeKeyword} />
        <p className="mt-2 text-xs text-slate-500">
          {keywords.length === 0
            ? 'No keywords set. Scraper will crawl all available jobs.'
            : 'Scraper searches each portal for these terms.'}
        </p>
      </Card>

      <PortalSelection
        selectedSources={selectedSources}
        onToggle={toggleSource}
        disabled={isRunning}
        showDeallsWarning={selectedSources.includes('dealls') && keywords.length > 0}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Scraper Run History</h2>
        <ScraperHistoryTable logs={logs} />
      </div>
    </div>
  );
}
