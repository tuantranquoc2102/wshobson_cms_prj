import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';

const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  iat: number;
  exp: number;
  jti: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_ACCESS_SECRET is not configured (must be at least 16 chars).',
    );
  }
  return new TextEncoder().encode(secret);
}

function newJti(): string {
  // jose ships with no jti generator; use the standard Web Crypto UUID.
  return crypto.randomUUID();
}

/**
 * Sign a 15-minute HS256 access token containing the user's id and role.
 */
export async function signAccessToken(payload: {
  sub: string;
  role: Role;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SECONDS)
    .setJti(newJti())
    .sign(getSecret());
}

/**
 * Verify an HS256 access token. Throws on invalid/expired tokens.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ['HS256'],
  });
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number' ||
    typeof payload.jti !== 'string'
  ) {
    throw new Error('Malformed access token payload');
  }
  return {
    sub: payload.sub,
    role: payload.role as Role,
    iat: payload.iat,
    exp: payload.exp,
    jti: payload.jti,
  };
}

export const ACCESS_TOKEN_TTL_SECONDS = ACCESS_TTL_SECONDS;
