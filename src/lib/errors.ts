export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const FALLBACK = 'Something went wrong. Try again.';

const USER_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Item not found or expired.',
  VALIDATION_ERROR: 'Check your input and try again.',
  QUEUE_FULL: 'Scraper queue is full. Wait and try again.',
  AI_UNAVAILABLE: 'AI review is not configured on the server.',
  AI_ERROR: 'AI review failed. Try again later.',
  PARSE_ERROR: 'Could not read that file.',
  INTERNAL_ERROR: 'Something went wrong. Try again later.',
  NETWORK_ERROR: 'Cannot reach the server. Is the API running?',
  UNKNOWN_ERROR: FALLBACK,
};

export function getUserMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return USER_ERROR_MESSAGES[error.code] ?? (error.message || FALLBACK);
  }
  if (error instanceof Error && error.message) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return USER_ERROR_MESSAGES.NETWORK_ERROR ?? FALLBACK;
    }
    return error.message;
  }
  return FALLBACK;
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
