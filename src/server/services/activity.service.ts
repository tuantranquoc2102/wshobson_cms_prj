import 'server-only';
import type { Prisma } from '@prisma/client';
import { ActivityLogRepo } from '@/server/db/repos/activityLog.repo';
import { logger } from '@/server/lib/logger';

export type ActivityInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export const ActivityService = {
  /**
   * Best-effort audit log write. We swallow errors so a transient logging
   * failure never aborts the user-facing mutation.
   */
  async record(
    input: ActivityInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    try {
      await ActivityLogRepo.record(input, tx);
    } catch (err) {
      logger.warn({ err, input }, 'ActivityService.record failed');
    }
  },
};
