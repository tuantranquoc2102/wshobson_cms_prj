import 'server-only';

type Bucket = { tokens: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: Date;
};

/**
 * Naive in-memory token bucket — fine for single-process local development.
 * In a multi-instance deployment this would need to be backed by Redis.
 */
export function checkRateLimit(
  key: string,
  max = 5,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { tokens: max - 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: fresh.tokens, resetAt: new Date(fresh.resetAt) };
  }

  if (existing.tokens <= 0) {
    return {
      ok: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
    };
  }

  existing.tokens -= 1;
  return {
    ok: true,
    remaining: existing.tokens,
    resetAt: new Date(existing.resetAt),
  };
}

/** Test helper: drop all rate-limit state. */
export function _resetRateLimit(): void {
  buckets.clear();
}
