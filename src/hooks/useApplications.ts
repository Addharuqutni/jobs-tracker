import { useCallback, useEffect, useState } from 'react';
import * as idb from '../lib/idb';
import type { Application, ApplicationStatus } from '../types';

interface UseApplicationsResult {
  applications: Application[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateStatus: (id: number, status: ApplicationStatus) => Promise<void>;
  updateNotes: (id: number, notes: string) => Promise<void>;
  deleteApplication: (id: number) => Promise<void>;
  deleteByStatus: (status: ApplicationStatus) => Promise<number>;
}

export function useApplications(params?: {
  status?: string;
  source?: string;
  keyword?: string;
  from?: string;
  to?: string;
}): UseApplicationsResult {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    idb
      .getApplications(params)
      .then((data) => {
        if (cancelled) return;
        setApplications(data ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using individual fields
  }, [params?.status, params?.source, params?.keyword, params?.from, params?.to, refetchCount]);

  const updateStatus = useCallback(async (id: number, status: ApplicationStatus) => {
    await idb.updateApplication(id, { status });
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, status, statusUpdatedAt: new Date().toISOString() }
          : app,
      ),
    );
  }, []);

  const updateNotes = useCallback(async (id: number, notes: string) => {
    await idb.updateApplication(id, { notes });
    setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, notes } : app)));
  }, []);

  const deleteApplication = useCallback(async (id: number) => {
    await idb.deleteApplication(id);
    setApplications((prev) => prev.filter((app) => app.id !== id));
  }, []);

  const deleteByStatus = useCallback(async (status: ApplicationStatus) => {
    const result = await idb.deleteApplicationsByStatus(status);
    setApplications((prev) => prev.filter((app) => app.status !== status));
    return result.deleted;
  }, []);

  useEffect(() => {
    const onChange = () => refetch();
    window.addEventListener('jobs-storage-changed', onChange);
    return () => window.removeEventListener('jobs-storage-changed', onChange);
  }, [refetch]);

  return { applications, loading, error, refetch, updateStatus, updateNotes, deleteApplication, deleteByStatus };
}
