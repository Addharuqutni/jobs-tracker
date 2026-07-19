import type { Response } from 'express';
import { isAppError, type AppError } from '../../../shared/src';

export function sendError(res: Response, error: AppError | { code: string; message: string; statusCode: number; details?: unknown }): void {
  if (isAppError(error)) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }
  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  });
}
