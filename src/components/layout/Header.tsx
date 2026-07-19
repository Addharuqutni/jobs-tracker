import { useState } from 'react';
import { Activity, Menu, Play, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useScraperStatus } from '../../hooks/useAnalytics';
import { getScraperIndicator } from '../../utils/scraper-indicator';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { ScraperPanel } from '../scraper/ScraperPanel';

interface HeaderProps {
  onMenuOpen: () => void;
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Scraper operations',
  '/feed': 'Job discovery',
  '/tracker': 'Application pipeline',
  '/analytics': 'Career insights',
};

export function Header({ onMenuOpen }: HeaderProps) {
  const { pathname } = useLocation();
  const { status, loading, isRunning, isActive, queuePosition, runStatus, start, refetch } =
    useScraperStatus();
  const { show } = useToast();
  const [triggering, setTriggering] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const { dotClass, statusText } = getScraperIndicator({
    isRunning: isActive || isRunning,
    loading,
    portals: status?.portals,
    runStatus,
    queuePosition,
  });

  async function handleQuickRun() {
    setTriggering(true);
    try {
      const enqueued = await start();
      if (enqueued?.status === 'queued' && enqueued.position) {
        show(`Queued #${enqueued.position}`);
      } else {
        show('Scraper started');
      }
      refetch();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to queue scraper', 'error');
    } finally {
      setTriggering(false);
    }
  }

  return (
    <>
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-2 border-b-2 border-slate-50 bg-purple-500 px-3 text-slate-50 sm:px-6">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuOpen}
          className="control-focus flex min-h-11 min-w-11 items-center justify-center border border-slate-50/40 text-slate-50 hover:bg-white/20 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="hidden min-w-0 border-l border-white/35 pl-4 lg:block">
          <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-slate-50/70">
            Workspace
          </p>
          <p className="truncate text-sm font-semibold text-slate-50">
            {pageNames[pathname] ?? 'Job Tracker'}
          </p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="control-focus flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 text-sm font-semibold text-slate-50 transition-colors hover:bg-white/20 sm:px-3 lg:ml-3"
          aria-label={`Scraper status: ${statusText}. Open settings`}
        >
          <Activity size={16} />
          <span className="hidden md:inline">Scraper</span>
          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          <span className="hidden text-slate-50 sm:inline">{statusText}</span>
          <Settings size={14} className="hidden text-slate-50/70 sm:block" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleQuickRun}
            disabled={triggering}
            aria-label={
              isActive
                ? 'Queue another scraper run'
                : triggering
                  ? 'Queueing scraper'
                  : 'Run scraper'
            }
            className="control-focus inline-flex min-h-11 items-center justify-center gap-2 border-2 border-slate-50 bg-blue-500 px-3 text-xs font-bold text-white shadow-artistic-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
          >
            <Play size={14} />
            <span className="hidden sm:inline">
              {triggering ? 'Queueing...' : isActive ? 'Queue another' : 'Run Scraper'}
            </span>
          </button>
        </div>
      </header>

      <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title="Scraper Settings">
        <ScraperPanel
          onRunComplete={() => {
            refetch();
          }}
        />
      </Modal>
    </>
  );
}
