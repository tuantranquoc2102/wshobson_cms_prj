import 'server-only';
import type { NextResponse } from 'next/server';

export const REFRESH_COOKIE_NAME = 'cms_rt';
const COOKIE_PATH = '/api/auth';
const MAX_AGE = 30 * 24 * 60 * 60; // seconds

type CookieAttributes = {
  httpOnly: boolean;
  sameSite: 'lax';
  path: string;
  secure: boolean;
  maxAge: number;
};

function attributes(): CookieAttributes {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: COOKIE_PATH,
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  };
}

/**
 * Attach the refresh-token cookie to a `NextResponse`.
 * The cookie is path-scoped to `/api/auth` so it is only ever sent on the
 * auth endpoints — mutating endpoints rely on the `Authorization` header.
 */
export function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set(REFRESH_COOKIE_NAME, token, attributes());
}

/** Clear the refresh-token cookie (logout). */
export function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set(REFRESH_COOKIE_NAME, '', {
    ...attributes(),
    maxAge: 0,
  });
}
