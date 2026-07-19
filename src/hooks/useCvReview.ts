import { useCallback, useState } from 'react';
import { api } from '../lib/api';
import { getUserMessage } from '../lib/errors';
import * as idb from '../lib/idb';
import type { CvReview } from '../types';

interface CvReviewState {
  loading: boolean;
  error: string | null;
  review: CvReview | null;
}

export function useCvReview() {
  const [state, setState] = useState<CvReviewState>({ loading: false, error: null, review: null });

  const submit = useCallback(async (file: File, jobId?: number) => {
    setState({ loading: true, error: null, review: null });
    try {
      const job = jobId !== undefined ? await idb.getJobById(jobId) : null;
      const result = await api.reviewCv(file, job);
      setState({ loading: false, error: null, review: result });
    } catch (error) {
      setState({ loading: false, error: getUserMessage(error), review: null });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, review: null });
  }, []);

  return { ...state, submit, reset };
}
