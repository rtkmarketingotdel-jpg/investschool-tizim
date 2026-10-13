import type { NextFunction, Request, Response } from 'express';
import type { ApiKey } from '../data/types.js';
import { ApiError } from '../lib/errors.js';
import { apiKeyRepo } from '../repositories/integrationRepo.js';

declare module 'express-serve-static-core' {
  interface Request {
    apiKey?: ApiKey;
  }
}

/** Integration API auth: "X-API-Key: rtk_…" (or "Authorization: Bearer rtk_…"). */
export async function requireApiKey(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('x-api-key') ?? req.header('authorization')?.replace(/^Bearer\s+/i, '');
    const key = header?.trim();
    if (!key || !key.startsWith('rtk_')) throw new ApiError(401, 'API_KEY_REQUIRED');
    const rec = await apiKeyRepo.findByKey(key);
    if (!rec) throw new ApiError(401, 'API_KEY_INVALID');
    await apiKeyRepo.touch(rec.id);
    req.apiKey = rec;
    next();
  } catch (e) {
    next(e);
  }
}
