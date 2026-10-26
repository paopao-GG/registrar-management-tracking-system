import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Tokens are not refreshed, so a login lasts exactly this long.
export const TOKEN_TTL_MS = 30 * 60 * 1000;

export interface TokenPayload {
  id: string;
  role: string;
  name: string;
  // The user's one live session; see login() in auth.service.
  sid: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL_MS / 1000 });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
