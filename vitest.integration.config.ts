import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Integration tests need to talk to a real PrismaClient, so this config
 * deliberately omits the `@/server/db/prisma` alias used by the unit-test
 * config. Point it at a real Postgres via TEST_DATABASE_URL.
 *
 * Run with: `vitest run -c vitest.integration.config.ts`
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: [
      { find: 'server-only', replacement: path.resolve(__dirname, 'tests/stubs/server-only.ts') },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
});
