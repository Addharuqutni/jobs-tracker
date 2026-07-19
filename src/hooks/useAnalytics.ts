import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import * as idb from '../lib/idb';
import { getUserMessage } from '../lib/errors';
import { onStorageChanged } from '../lib/storageEvents';
import { mergeScraperStatus } from '../utils/mergeScraperStatus';
import { useScraperRun } from './useScraperRun';
import type { AnalyticsData, ScraperStatus, ScraperStatusResponse } from '../types';

const PORTAL_SOURCES = ['jobstreet', 'linkedin', 'kalibrr', 'glints', 'dealls'];

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
        setError(getUserMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using individual fields
  }, [params?.from, params?.to, refetchCount]);

  useEffect(() => onStorageChanged(['applications'], refetch), [refetch]);

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
  const [portalStatus, setPortalStatus] = useState<ScraperStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetchCount, setRefetchCount] = useState(0);
  const { run, isActive, start, refetch: refetchRun } = useScraperRun();

  const refetch = useCallback(() => {
    setRefetchCount((c) => c + 1);
    refetchRun();
  }, [refetchRun]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getScraperStatus(),
      idb.getPortalStatusFromLogs(PORTAL_SOURCES),
    ])
      .then(([s, portals]) => {
        if (cancelled) return;
        setStatus(s);
        setPortalStatus(portals);
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

  useEffect(
    () => onStorageChanged(['logs'], () => {
      void idb.getPortalStatusFromLogs(PORTAL_SOURCES).then(setPortalStatus);
    }),
    [],
  );

  // ponytail: API /status returns empty portals; baseline from IndexedDB logs.
  const baseStatus: ScraperStatusResponse | null = status
    ? { ...status, portals: portalStatus }
    : null;

  return {
    status: mergeScraperStatus(baseStatus, run, isActive),
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
