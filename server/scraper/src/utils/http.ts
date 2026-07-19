const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

export class HttpError extends Error {
  constructor(public status: number, public url: string, public retryAfterMs: number | null = null) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
}

const MAX_RETRIES = 3;

function retryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function isRetryable(err: unknown): boolean {
  return err instanceof HttpError
    ? err.status === 408 || err.status === 429 || err.status >= 500
    : err instanceof TypeError || (err instanceof Error && err.name === 'AbortError');
}

async function request(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
      if (!res.ok) throw new HttpError(res.status, url, retryAfterMs(res.headers.get('retry-after')));
      return res;
    } catch (err) {
      if (attempt >= MAX_RETRIES || !isRetryable(err)) throw err;
      const retryAfter = err instanceof HttpError ? err.retryAfterMs : null;
      const jitter = Math.floor(Math.random() * 250);
      await new Promise(resolve => setTimeout(resolve, retryAfter ?? 500 * 2 ** attempt + jitter));
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function fetchPage(url: string, timeoutMs: number = 15000): Promise<string> {
  const res = await request(url, { headers: DEFAULT_HEADERS }, timeoutMs);
  return await res.text();
}

export async function fetchJson<T>(url: string, options?: RequestInit, timeoutMs: number = 15000): Promise<T> {
  const res = await request(url, {
      ...options,
      headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    }, timeoutMs);
  return await res.json() as T;
}

export function isBlocked(err: unknown): boolean {
  if (err instanceof HttpError) {
    return err.status === 403 || err.status === 429 || err.status === 999;
  }
  return false;
}
