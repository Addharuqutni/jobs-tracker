import { useCallback, useEffect, useState } from 'react';
import * as idb from '../lib/idb';
import type { Job, Pagination } from '../types';

interface UseJobsParams {
  keyword?: string;
  location?: string;
  source?: string;
  page?: number;
  pageSize?: number;
  sort?: 'newest' | 'title' | 'company';
}

interface UseJobsResult {
  jobs: Job[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useJobs(params: UseJobsParams): UseJobsResult {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    idb
      .getJobs(params)
      .then((result) => {
        if (cancelled) return;
        setJobs(result.data ?? []);
        setPagination(result.pagination ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using individual fields not the object
  }, [params.keyword, params.location, params.source, params.page, params.pageSize, params.sort, refetchCount]);

  useEffect(() => {
    const onChange = () => refetch();
    window.addEventListener('jobs-storage-changed', onChange);
    return () => window.removeEventListener('jobs-storage-changed', onChange);
  }, [refetch]);

  return { jobs, pagination, loading, error, refetch };
}
