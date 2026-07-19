import { useSyncExternalStore } from 'react';
import {
  clear,
  getServerSnapshot,
  getSnapshot,
  refetch,
  start,
  subscribe,
} from '../lib/scraperRunStore';
import type { ScraperEnqueueResponse, ScraperRunParams, ScraperRunResponse } from '../types';

interface UseScraperRunResult {
  run: ScraperRunResponse | null;
  runId: string | null;
  isActive: boolean;
  loading: boolean;
  error: string | null;
  start: (params?: ScraperRunParams) => Promise<ScraperEnqueueResponse | null>;
  clear: () => void;
  refetch: () => void;
}

export function useScraperRun(): UseScraperRunResult {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...snap, start, clear, refetch };
}
