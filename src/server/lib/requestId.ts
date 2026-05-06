import 'server-only';
import type { Logger } from 'pino';
import { logger } from './logger';

/** Generate a fresh v4 UUID. */
export function newRequestId(): string {
  return crypto.randomUUID();
}

/** Return a child logger pre-tagged with the supplied request id. */
export function withRequestId(reqId: string, base: Logger = logger): Logger {
  return base.child({ reqId });
}
