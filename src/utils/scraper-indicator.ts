import type { ScraperStatus } from '../types';

interface ScraperIndicator {
  dotClass: string;
  statusText: string;
}

export function getScraperIndicator(opts: {
  isRunning: boolean;
  loading: boolean;
  portals?: ScraperStatus[];
  runStatus?: string | null;
  queuePosition?: number | null;
}): ScraperIndicator {
  const { isRunning, loading, portals, runStatus, queuePosition } = opts;
  const allOk = !loading && portals?.every((p) => p.lastStatus === 'success');
  const hasError = !loading && portals?.some((p) => p.lastStatus === 'error');
  const queued = runStatus === 'queued';

  const dotClass = queued || isRunning
    ? 'bg-yellow-500 animate-pulse'
    : loading
      ? 'bg-slate-500'
      : hasError
        ? 'bg-red-500'
        : allOk
          ? 'bg-green-500'
          : 'bg-yellow-500';

  const statusText = queued
    ? queuePosition
      ? `Queued #${queuePosition}`
      : 'Queued...'
    : isRunning
      ? 'Running...'
      : loading
        ? 'Checking...'
        : hasError
          ? 'Some portals failed'
          : allOk
            ? 'All portals OK'
            : 'Unknown';

  return { dotClass, statusText };
}
