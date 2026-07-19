import { useState } from 'react';
import { Play, Activity, Trash2 } from 'lucide-react';
import { SOURCES, SOURCE_LABELS } from '../../constants';
import { useScraperKeywords } from '../../hooks/useScraperKeywords';
import { useScraperSources } from '../../hooks/useScraperSources';
import { useScraperEngine } from '../../hooks/useScraperEngine';
import { useScraperStatus } from '../../hooks/useAnalytics';
import { getScraperIndicator } from '../../utils/scraper-indicator';
import { useToast } from '../ui/Toast';
import { KeywordInput } from './KeywordInput';
import { Button } from '../ui/Button';
import type { PythonScraperTool, ScraperEngine } from '../../types';

interface ScraperPanelProps {
  onRunComplete?: () => void;
}

export function ScraperPanel({ onRunComplete }: ScraperPanelProps) {
  const { keywords, addKeyword, removeKeyword, clearKeywords } = useScraperKeywords();
  const { selectedSources, toggleSource, clearSources } = useScraperSources();
  const { engine, pythonTool, setEngine, setPythonTool } = useScraperEngine();
  const { status, loading, isRunning, isActive, queuePosition, runStatus, start, refetch } =
    useScraperStatus();
  const { show } = useToast();
  const [triggering, setTriggering] = useState(false);

  const { dotClass, statusText } = getScraperIndicator({
    isRunning: isActive || isRunning,
    loading,
    portals: status?.portals,
    runStatus,
    queuePosition,
  });

  async function handleRun() {
    setTriggering(true);
    try {
      const enqueued = await start({
        keywords: keywords.length > 0 ? keywords : undefined,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        engine,
        pythonTool,
      });
      if (enqueued?.status === 'queued' && enqueued.position) {
        show(`Queued at position #${enqueued.position}`);
      } else {
        show(
          keywords.length > 0
            ? `Scraper started with ${keywords.length} keyword${keywords.length > 1 ? 's' : ''}`
            : 'Scraper started',
        );
      }
      refetch();
      onRunComplete?.();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to queue scraper', 'error');
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
        <Activity size={16} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide">Status</span>
        <span className={`ml-auto inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        <span className="text-slate-300">{statusText}</span>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={isActive}>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Engine</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Scraping engine">
          {(['native', 'hybrid'] as ScraperEngine[]).map((value) => {
            const active = engine === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setEngine(value)}
                disabled={isActive}
                className={`control-focus inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors disabled:opacity-50 ${
                  active
                    ? 'border border-blue-500/40 bg-blue-500/15 text-blue-300'
                    : 'border border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
        {engine === 'hybrid' && (
          <select
            value={pythonTool}
            onChange={(event) => setPythonTool(event.target.value as PythonScraperTool)}
            disabled={isActive}
            aria-label="Python scraper tool"
            className="control-focus min-h-11 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
          >
            <option value="auto">Auto tool selection</option>
            <option value="beautifulsoup">Beautiful Soup</option>
            <option value="scrapy">Scrapy</option>
            <option value="selenium">Selenium</option>
            <option value="playwright">Playwright</option>
          </select>
        )}
        <p className="text-xs text-slate-500">
          {engine === 'hybrid'
            ? 'Python sidecar is attempted first. Native TypeScript runs automatically if unavailable or disallowed.'
            : 'Use the production TypeScript adapters only.'}
        </p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Keywords</span>
          {keywords.length > 0 && (
            <button
              type="button"
              onClick={clearKeywords}
              className="control-focus inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-slate-500 hover:text-red-400"
            >
              <Trash2 size={12} />
              Clear all
            </button>
          )}
        </div>
        <KeywordInput
          keywords={keywords}
          onAdd={addKeyword}
          onRemove={removeKeyword}
        />
        <p className="text-xs text-slate-500">
          {keywords.length === 0
            ? 'No keywords set. Scraper will crawl all available jobs.'
            : `${keywords.length} keyword${keywords.length > 1 ? 's' : ''} set. Scraper will search each portal for these terms.`}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={isActive}>
        <legend className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Portals</span>
          {selectedSources.length > 0 && (
            <button
              type="button"
              onClick={clearSources}
              className="control-focus inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-slate-500 hover:text-red-400"
            >
              <Trash2 size={12} />
              Reset
            </button>
          )}
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Portal selection">
          {SOURCES.map((source) => {
            const checked = selectedSources.length === 0 || selectedSources.includes(source);
            return (
              <button
                key={source}
                type="button"
                aria-pressed={checked}
                onClick={() => toggleSource(source)}
                disabled={isActive}
                className={`control-focus min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  checked
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                {SOURCE_LABELS[source]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          {selectedSources.length === 0
            ? 'All portals selected (default)'
            : `${selectedSources.length} portal${selectedSources.length > 1 ? 's' : ''} selected`}
        </p>
        {selectedSources.includes('dealls') && keywords.length > 0 && (
          <p className="text-xs text-amber-400/80">
            Dealls is fetched once, then filtered locally by title and company.
          </p>
        )}
      </fieldset>

      <Button
        variant="primary"
        onClick={handleRun}
        disabled={triggering}
        className="w-full"
      >
        <Play size={16} />
        {triggering
          ? 'Queueing...'
          : isActive
            ? 'Queue another run'
            : 'Run Scraper Now'}
      </Button>
    </div>
  );
}
