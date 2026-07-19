import { API_BASE_URL } from '../constants';
import type {
  CvReview,
  Job,
  ScraperEnqueueResponse,
  ScraperRunParams,
  ScraperRunResponse,
  ScraperStatusResponse,
} from '../types';
import { ApiClientError } from './errors';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: unknown };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiClientError('NETWORK_ERROR', 'Cannot reach the server');
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      'INTERNAL_ERROR',
      `Invalid response from server (${res.status})`,
      res.status,
    );
  }

  if (!json.success) {
    throw new ApiClientError(
      json.error?.code ?? 'UNKNOWN_ERROR',
      json.error?.message ?? 'Unknown error',
      res.status,
      json.error?.details,
    );
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

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/cv/review`, { method: 'POST', body: form });
    } catch {
      throw new ApiClientError('NETWORK_ERROR', 'Cannot reach the server');
    }

    let json: ApiResponse<CvReview>;
    try {
      json = (await res.json()) as ApiResponse<CvReview>;
    } catch {
      throw new ApiClientError(
        'INTERNAL_ERROR',
        `Invalid response from server (${res.status})`,
        res.status,
      );
    }

    if (!json.success) {
      throw new ApiClientError(
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? 'CV review failed',
        res.status,
        json.error?.details,
      );
    }
    return json.data;
  },
};
