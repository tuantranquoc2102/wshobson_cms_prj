/**
 * NOTE: This suite hits a real Postgres pointed at `TEST_DATABASE_URL`.
 * It bypasses the route-handler layer because the project's vitest config
 * aliases `@/server/db/prisma` to a stub for unit tests; calling services
 * directly with a dedicated PrismaClient sidesteps that.
 *
 * To run: set TEST_DATABASE_URL and run `prisma migrate deploy` against it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HAS_TEST_DB, getPrisma, resetDb } from './_setup';

const maybe = HAS_TEST_DB ? describe : describe.skip;

maybe('Auth service (integration)', () => {
  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-secret-test-secret-test-secret';
    await resetDb();
  });
  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it('register → login → bad password rejected', async () => {
    // We import dynamically so the test doesn't pay the cost when skipped.
    const { AuthService } = await import('@/server/services/auth.service');

    const reg = await AuthService.register(
      { email: 'flow@example.com', name: 'Flow', password: 'pass1234' },
      '127.0.0.1',
    );
    expect(reg.user.email).toBe('flow@example.com');
    expect(reg.tokens.accessToken).toBeTruthy();

    const login = await AuthService.login(
      { email: 'flow@example.com', password: 'pass1234' },
      '127.0.0.2',
    );
    expect(login.user.id).toBe(reg.user.id);

    await expect(
      AuthService.login(
        { email: 'flow@example.com', password: 'wrong-password' },
        '127.0.0.3',
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
});
