import type { ScraperLastRun } from '../types';
import { addScraperLogs, mergeJobs } from './idb';
import { notifyStorageChanged } from './storageEvents';

const KEY = 'scraper-last-ingested-run';
const ACTIVE_KEY = 'scraper-active-run-id';

const activeListeners = new Set<(runId: string | null) => void>();

function getLastIngestedRunId(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function setLastIngestedRunId(runId: string): void {
  try {
    sessionStorage.setItem(KEY, runId);
  } catch {
    // private mode
  }
}

export function getActiveRunId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveRunId(runId: string | null): void {
  try {
    if (runId) sessionStorage.setItem(ACTIVE_KEY, runId);
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    // private mode
  }
  for (const listener of activeListeners) listener(runId);
}

export function onActiveRunIdChange(listener: (runId: string | null) => void): () => void {
  activeListeners.add(listener);
  return () => {
    activeListeners.delete(listener);
  };
}

/** Merge run result into IndexedDB once per runId. */
export async function ingestRunResult(
  runId: string,
  result: ScraperLastRun | null | undefined,
): Promise<boolean> {
  if (!runId || !result?.finishedAt) return false;
  if (getLastIngestedRunId() === runId) return false;

  await mergeJobs(result.jobs ?? []);
  await addScraperLogs(result.logs ?? []);
  setLastIngestedRunId(runId);
  setActiveRunId(null);
  notifyStorageChanged(['jobs', 'logs']);
  return true;
}
