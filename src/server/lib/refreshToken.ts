import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Generate a fresh opaque refresh token (256-bit, base64url).
 * The raw token is sent to the client via httpOnly cookie; the SHA-256
 * hash is what we store in the DB so a leaked DB doesn't yield live tokens.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hash of the raw refresh token. */
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export const REFRESH_TOKEN_TTL_DAYS = 30;
export const REFRESH_TOKEN_TTL_MS =
  REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
