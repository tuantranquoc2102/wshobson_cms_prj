// Test-only stub for `@/server/db/prisma`. Importing the real module would
// instantiate a `PrismaClient`, which tries to connect to the database.
// Tests inject a per-test mock client via the `tx` parameter on every repo
// method, so this fallback should never actually be invoked.
export const prisma = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'Default prisma client touched in a unit test. Pass a mock tx explicitly to the repo method.',
      );
    },
  },
);
