import type { ScraperRunResponse, ScraperStatusResponse } from '../types';

/** Overlay live run onto cached /status payload. */
export function mergeScraperStatus(
  status: ScraperStatusResponse | null,
  run: ScraperRunResponse | null,
  isActive: boolean,
): ScraperStatusResponse | null {
  if (!status) return null;
  return {
    ...status,
    portals: run?.result?.portals ?? status.portals,
    isRunning: status.isRunning || isActive,
    lastRun: run?.result ?? status.lastRun,
  };
}
