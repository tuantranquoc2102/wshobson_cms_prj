import 'server-only';
import { PrismaClient } from '@prisma/client';

// HMR-safe singleton: in dev, Next.js hot-reloads server modules and would
// otherwise create a new PrismaClient (and a new connection pool) on every
// edit. We cache the instance on globalThis so a single client survives
// reloads. In production we always create exactly one.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
