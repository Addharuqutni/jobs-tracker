import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import * as idb from '../lib/idb';
import { useScraperRun } from './useScraperRun';
import type { AnalyticsData, ScraperStatusResponse } from '../types';

interface UseAnalyticsResult {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAnalytics(params?: { from?: string; to?: string }): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    idb
      .getAnalytics(params)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using individual fields
  }, [params?.from, params?.to, refetchCount]);

  useEffect(() => {
    const onChange = () => refetch();
    window.addEventListener('jobs-storage-changed', onChange);
    return () => window.removeEventListener('jobs-storage-changed', onChange);
  }, [refetch]);

  return { data, loading, error, refetch };
}

interface UseScraperStatusResult {
  status: ScraperStatusResponse | null;
  loading: boolean;
  isRunning: boolean;
  isActive: boolean;
  queuePosition: number | null;
  queueLength: number;
  runStatus: string | null;
  start: ReturnType<typeof useScraperRun>['start'];
  refetch: () => void;
}

export function useScraperStatus(): UseScraperStatusResult {
  const [status, setStatus] = useState<ScraperStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchCount, setRefetchCount] = useState(0);
  const {
    run,
    isActive,
    start,
    refetch: refetchRun,
  } = useScraperRun();

  const refetch = useCallback(() => {
    setRefetchCount((c) => c + 1);
    refetchRun();
  }, [refetchRun]);

  useEffect(() => {
    let cancelled = false;
    api
      .getScraperStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refetchCount]);

  const portals = run?.result?.portals ?? status?.portals;
  const merged: ScraperStatusResponse | null = status
    ? {
        ...status,
        portals: portals ?? status.portals,
        isRunning: status.isRunning || isActive,
        lastRun: run?.result ?? status.lastRun,
      }
    : null;

  return {
    status: merged,
    loading,
    isRunning: isActive || (status?.isRunning ?? false),
    isActive,
    queuePosition: run?.position ?? null,
    queueLength: run?.queueLength ?? status?.queueLength ?? 0,
    runStatus: run?.status ?? null,
    start,
    refetch,
  };
}
