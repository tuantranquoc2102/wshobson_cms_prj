import { vi, type Mock } from 'vitest';
import type { Prisma } from '@prisma/client';

/**
 * A model delegate stub: every Prisma method we call from the repos is a
 * `vi.fn()` we can assert against. Tests cast the returned object to
 * `Prisma.TransactionClient` and pass it to each repo method's `tx` arg.
 */
export type ModelStub = Record<string, Mock>;

export type PrismaStub = {
  user: ModelStub;
  refreshToken: ModelStub;
  content: ModelStub;
  revision: ModelStub;
  category: ModelStub;
  tag: ModelStub;
  contentCategory: ModelStub;
  contentTag: ModelStub;
  media: ModelStub;
  activityLog: ModelStub;
};

function model(methods: readonly string[]): ModelStub {
  const out: ModelStub = {};
  for (const m of methods) {
    out[m] = vi.fn().mockResolvedValue(undefined);
  }
  return out;
}

export function makePrismaStub(): PrismaStub {
  const crud = [
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findMany',
    'create',
    'createMany',
    'update',
    'updateMany',
    'upsert',
    'delete',
    'deleteMany',
    'count',
  ] as const;
  return {
    user: model(crud),
    refreshToken: model(crud),
    content: model(crud),
    revision: model(crud),
    category: model(crud),
    tag: model(crud),
    contentCategory: model(crud),
    contentTag: model(crud),
    media: model(crud),
    activityLog: model(crud),
  };
}

/** Cast helper — repos accept `Prisma.TransactionClient` and only use the
 * model delegates, so a structural stub is sufficient for unit tests. */
export function asTx(stub: PrismaStub): Prisma.TransactionClient {
  return stub as unknown as Prisma.TransactionClient;
}
