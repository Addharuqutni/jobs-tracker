import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import * as idb from '../lib/idb';
import { getUserMessage } from '../lib/errors';
import { onStorageChanged } from '../lib/storageEvents';
import { mergeScraperStatus } from '../utils/mergeScraperStatus';
import { useScraperRun } from './useScraperRun';
import type { ScraperLogEntry, ScraperStatusResponse } from '../types';

interface UseScraperDashboardResult {
  status: ScraperStatusResponse | null;
  logs: ScraperLogEntry[];
  totalJobsScraped: number;
  lastRunTime: string | null;
  loading: boolean;
  isRunning: boolean;
  isActive: boolean;
  queuePosition: number | null;
  queueLength: number;
  runStatus: string | null;
  error: string | null;
  refetch: () => void;
  startRun: ReturnType<typeof useScraperRun>['start'];
}

export function useScraperDashboard(): UseScraperDashboardResult {
  const [status, setStatus] = useState<ScraperStatusResponse | null>(null);
  const [logs, setLogs] = useState<ScraperLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);
  const {
    run,
    isActive,
    error: runError,
    start: startRun,
    refetch: refetchRun,
  } = useScraperRun();

  const refetch = useCallback(() => {
    setRefetchCount((c) => c + 1);
    refetchRun();
  }, [refetchRun]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([api.getScraperStatus(), idb.getScraperLogs(20)])
      .then(([statusData, logsData]) => {
        if (cancelled) return;
        setStatus(statusData);
        setLogs(logsData);
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
  }, [refetchCount]);

  useEffect(
    () =>
      onStorageChanged(['logs'], () => {
        void idb.getScraperLogs(20).then(setLogs);
      }),
    [],
  );

  const merged = mergeScraperStatus(status, run, isActive);
  const portals = merged?.portals ?? [];

  const totalJobsScraped =
    portals.reduce((sum, p) => sum + (p.jobsScraped ?? 0), 0) || (run?.result?.jobs.length ?? 0);

  const lastRunTime =
    run?.finishedAt ??
    portals
      .map((p) => p.lastRun)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
    null;

  return {
    status: merged,
    logs,
    totalJobsScraped,
    lastRunTime,
    loading,
    isRunning: isActive || (status?.isRunning ?? false),
    isActive,
    queuePosition: run?.position ?? null,
    queueLength: run?.queueLength ?? status?.queueLength ?? 0,
    runStatus: run?.status ?? null,
    error: error ?? runError,
    refetch,
    startRun,
  };
}
