import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import type { Role } from '../data/types.js';

export interface TokenPayload {
  sub: string;
  role: Role;
}

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });

export const verifyToken = (token: string) => jwt.verify(token, env.jwtSecret) as TokenPayload;
