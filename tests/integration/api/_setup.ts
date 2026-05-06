/**
 * Shared helpers for the integration test suite. The test DB is selected via
 * `process.env.TEST_DATABASE_URL` (which must equal `DATABASE_URL` since the
 * service layer reads through the Prisma singleton). If `TEST_DATABASE_URL`
 * is unset, suites use `describe.skipIf` to noop.
 *
 * Run with: `vitest run -c vitest.integration.config.ts`
 */
import bcrypt from 'bcrypt';
import { prisma } from '@/server/db/prisma';

export const HAS_TEST_DB =
  typeof process.env.TEST_DATABASE_URL === 'string' &&
  process.env.TEST_DATABASE_URL.length > 0;

export function getPrisma(): typeof prisma {
  return prisma;
}

export async function resetDb(): Promise<void> {
  // Order matters — children first.
  await prisma.activityLog.deleteMany();
  await prisma.contentTag.deleteMany();
  await prisma.contentCategory.deleteMany();
  await prisma.revision.deleteMany();
  await prisma.content.deleteMany();
  await prisma.media.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedUser(args: {
  email: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'AUTHOR';
  name?: string;
}): Promise<{ id: string }> {
  const passwordHash = await bcrypt.hash(args.password, 4); // cheap for tests
  const u = await prisma.user.create({
    data: {
      email: args.email,
      passwordHash,
      role: args.role,
      name: args.name ?? args.email,
    },
  });
  return { id: u.id };
}
