import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/errors';
import { config } from '../config';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  // Zod errors
  if ((err as { name?: string }).name === 'ZodError') {
    const zerr = err as { issues: { path: (string | symbol)[]; message: string }[] };
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: zerr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      },
    });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL', message: config.isProd ? 'Something went wrong' : String((err as Error).message || err) },
  });
};

/** Simple in-memory rate limiter (per IP + bucket) */
const buckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (max: number, windowMs: number) =>
  (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${Math.floor(Date.now() / windowMs)}`;
    const bucket = buckets.get(key) || { count: 0, resetAt: Date.now() + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);
    if (buckets.size > 10000) buckets.clear();
    if (bucket.count > max) {
      return next(new ApiError(429, 'RATE_LIMITED', 'Too many requests — slow down'));
    }
    next();
  };
