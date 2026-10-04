import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors.js';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'NOT_FOUND' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.code, details: err.details });
  }
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON' });
  if (type === 'entity.too.large') return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
}
