import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  getActiveRunId,
  ingestRunResult,
  onActiveRunIdChange,
  setActiveRunId,
} from '../lib/scraperIngest';
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
  const [runId, setRunId] = useState<string | null>(() => getActiveRunId());
  const [run, setRun] = useState<ScraperRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => onActiveRunIdChange((id) => setRunId(id)), []);

  const clear = useCallback(() => {
    setActiveRunId(null);
    setRun(null);
    setError(null);
  }, []);

  const start = useCallback(async (params?: ScraperRunParams) => {
    setLoading(true);
    setError(null);
    try {
      const enqueued = await api.runScraper(params);
      setActiveRunId(enqueued.runId);
      setRun({
        runId: enqueued.runId,
        status: enqueued.status,
        position: enqueued.position,
        queueLength: enqueued.queueLength,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        result: null,
      });
      return enqueued;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue scraper');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    api
      .getScraperRun(runId)
      .then(async (data) => {
        if (cancelled) return;
        setRun(data);
        setError(null);
        if (data.status === 'succeeded' && data.result) {
          await ingestRunResult(data.runId, data.result);
        }
        if (data.status === 'failed' || data.status === 'succeeded') {
          setActiveRunId(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load run';
        setError(message);
        if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('expired')) {
          setActiveRunId(null);
          setRunId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runId, tick]);

  const isActive = run?.status === 'queued' || run?.status === 'running';

  useEffect(() => {
    if (isActive && !pollRef.current) {
      pollRef.current = setInterval(() => refetch(), 3000);
    } else if (!isActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isActive, refetch]);

  return { run, runId, isActive, loading, error, start, clear, refetch };
}
