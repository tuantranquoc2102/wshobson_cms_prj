import 'server-only';
import type { NextRequest } from 'next/server';

// X-Forwarded-For / X-Real-IP are only honored when running behind a trusted
// proxy. Otherwise any client can spoof them per request to defeat the
// rate-limit bucket. Set TRUST_PROXY=1 in environments where the app sits
// behind a reverse proxy that controls these headers.
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

/**
 * Extract a best-effort client IP for rate-limit keys. Falls back to a
 * stable string so we always have *something* to bucket on.
 */
export function clientIp(req: NextRequest): string {
  if (TRUST_PROXY) {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
      const first = xff.split(',')[0]?.trim();
      if (first) return first;
    }
    const real = req.headers.get('x-real-ip');
    if (real) return real;
  }
  // NextRequest exposes connection IP at runtime in some adapters; fall back
  // to a constant key when nothing reliable is available, keeping the bucket
  // shared across unknown clients (safer default than per-request unique).
  return 'unknown';
}
