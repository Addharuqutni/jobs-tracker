import { API_BASE_URL } from '../constants';
import type {
  CvReview,
  Job,
  ScraperEnqueueResponse,
  ScraperRunParams,
  ScraperRunResponse,
  ScraperStatusResponse,
} from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Unknown error');
  }
  return json.data as T;
}

export const api = {
  getScraperStatus(): Promise<ScraperStatusResponse> {
    return request(`/scraper/status`);
  },

  getScraperRun(runId: string): Promise<ScraperRunResponse> {
    return request(`/scraper/runs/${encodeURIComponent(runId)}`);
  },

  runScraper(params?: ScraperRunParams): Promise<ScraperEnqueueResponse> {
    return request(`/scraper/run`, {
      method: 'POST',
      body: JSON.stringify(params ?? {}),
    });
  },

  async reviewCv(file: File, job?: Job | null): Promise<CvReview> {
    const form = new FormData();
    form.append('cv', file);
    if (job) form.append('job', JSON.stringify(job));
    const res = await fetch(`${API_BASE_URL}/cv/review`, { method: 'POST', body: form });
    const json = (await res.json()) as ApiResponse<CvReview>;
    if (!json.success) {
      throw new Error(json.error?.message ?? 'CV review failed');
    }
    return json.data;
  },
};
