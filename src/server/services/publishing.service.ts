import 'server-only';
import { prisma } from '@/server/db/prisma';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { ActivityService } from './activity.service';
import { logger } from '@/server/lib/logger';

export type PublishResult = { published: number; ids: string[] };

const SYSTEM_ACTOR_ID = '__cron__';

export const PublishingService = {
  /**
   * Promote any DRAFT/IN_REVIEW content whose `scheduledFor <= now` to
   * PUBLISHED. Idempotent — repo helper filters out already-published rows.
   */
  async runScheduledPublish(now: Date = new Date()): Promise<PublishResult> {
    const due = await ContentRepo.findScheduledDue(now);
    if (due.length === 0) return { published: 0, ids: [] };

    const ids = due.map((d) => d.id);

    await prisma.$transaction(async (tx) => {
      await ContentRepo.publishScheduled(ids, tx);
    });

    // Best-effort: revalidate public surfaces; activity audit per item.
    let revalidatePath: ((p: string) => void) | null = null;
    try {
      const mod = await import('next/cache');
      revalidatePath = mod.revalidatePath;
    } catch {
      // Outside a server context — fine.
    }

    const rows = await prisma.content.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, type: true, authorId: true },
    });

    for (const r of rows) {
      try {
        if (revalidatePath) {
          if (r.type === 'POST') revalidatePath(`/blog/${r.slug}`);
          else revalidatePath(`/p/${r.slug}`);
          revalidatePath('/');
        }
      } catch (err) {
        logger.debug({ err }, 'revalidatePath skipped');
      }
      await ActivityService.record({
        actorId: r.authorId || SYSTEM_ACTOR_ID,
        action: 'content.scheduledPublish',
        entityType: 'Content',
        entityId: r.id,
        metadata: { slug: r.slug },
      });
    }

    return { published: rows.length, ids };
  },
};
