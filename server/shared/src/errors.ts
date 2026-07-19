export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} not found: ${id}` : `${resource} not found`,
      'NOT_FOUND',
      404,
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class QueueFullError extends AppError {
  constructor(queueLength: number) {
    super(
      `Scraper queue is full (${queueLength} waiting). Try again later.`,
      'QUEUE_FULL',
      429,
    );
  }
}

export class AiUnavailableError extends AppError {
  constructor(message = 'AI provider is not configured. Set AI_API_KEY.') {
    super(message, 'AI_UNAVAILABLE', 503);
  }
}

export class AiError extends AppError {
  constructor(message: string) {
    super(message, 'AI_ERROR', 502);
  }
}

export class ParseError extends AppError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR', 400);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
