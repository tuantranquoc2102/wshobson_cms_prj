import 'server-only';
import pino, { type Logger } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Field paths pino will replace with `[Redacted]` before serializing log
 * objects. Covers credentials, hashes, and any auth-bearing transport headers
 * we might accidentally log when dumping a request/response object.
 */
const redactPaths: string[] = [
  'password',
  'passwordHash',
  'authorization',
  'cookie',
  'accessToken',
  'refreshToken',
  'tokenHash',
  '*.password',
  '*.passwordHash',
  '*.authorization',
  '*.cookie',
  '*.accessToken',
  '*.refreshToken',
  '*.tokenHash',
];

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  redact: { paths: redactPaths, censor: '[Redacted]' },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
});
