import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';
import { userRepo } from '../repositories/userRepo.js';
import type { Role, User } from '../data/types.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'AUTH_REQUIRED');
    let payload;
    try {
      payload = verifyToken(header.slice(7));
    } catch {
      throw new ApiError(401, 'AUTH_INVALID_TOKEN');
    }
    const user = await userRepo.findById(payload.sub);
    if (!user || !user.isActive) throw new ApiError(401, 'AUTH_INVALID_TOKEN');
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, 'FORBIDDEN'));
    next();
  };
