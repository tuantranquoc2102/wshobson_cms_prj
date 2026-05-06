import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: [
      // `server-only` ships a runtime that throws if loaded in client code.
      // Tests import server modules directly, so alias it to an empty stub.
      { find: 'server-only', replacement: path.resolve(__dirname, 'tests/stubs/server-only.ts') },
      // Replace the real Prisma singleton with a Proxy that throws on use,
      // so tests must supply a `tx` mock instead of touching a real DB.
      { find: '@/server/db/prisma', replacement: path.resolve(__dirname, 'tests/stubs/prisma.ts') },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
});
