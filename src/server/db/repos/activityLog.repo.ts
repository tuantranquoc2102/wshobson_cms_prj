import 'server-only';
import type { ActivityLog, Prisma } from '@prisma/client';
import { prisma as defaultClient } from '@/server/db/prisma';

type Db = Prisma.TransactionClient | typeof defaultClient;

function db(tx?: Prisma.TransactionClient): Db {
  return tx ?? defaultClient;
}

export const ActivityLogRepo = {
  /**
   * Append-only audit record. Best-effort — services should not fail a
   * mutation because the activity write blew up; wrap in try/catch at the
   * call site if needed.
   */
  async record(
    input: {
      actorId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).activityLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | null,
      },
    });
  },

  /** Admin dashboard: most-recent activity across the whole system. */
  listRecent(limit: number, tx?: Prisma.TransactionClient): Promise<ActivityLog[]> {
    return db(tx).activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /** Audit trail for a specific entity (e.g. all events on a Content row). */
  listForEntity(
    entityType: string,
    entityId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ActivityLog[]> {
    return db(tx).activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  },
};

export type ActivityLogRepoType = typeof ActivityLogRepo;
