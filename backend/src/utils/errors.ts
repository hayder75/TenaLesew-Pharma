import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Not authenticated') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Not allowed', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }
  static licenseExpired(message = 'Branch license expired — contact the platform to renew') {
    return new ApiError(402, 'LICENSE_EXPIRED', message);
  }
}

/** Wrap async route handlers so thrown errors reach the error middleware */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asyncHandler =
  (fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
