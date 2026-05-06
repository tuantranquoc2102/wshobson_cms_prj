/**
 * Bootstrap an ADMIN user from environment variables. Idempotent:
 * if a user already exists with `SEED_ADMIN_EMAIL` we promote them to ADMIN
 * and reset the password; otherwise we create one.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=changeme123 \
 *     tsx scripts/create-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Site Admin';

  if (!email || !password) {
    console.error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment.',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', passwordHash, deletedAt: null, name },
      create: { email, name, role: 'ADMIN', passwordHash },
    });
    console.log(`Admin ready: ${user.email} (id=${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
