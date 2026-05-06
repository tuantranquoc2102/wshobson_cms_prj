import 'server-only';
import type { Content, Revision } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { RevisionRepo } from '@/server/db/repos/revision.repo';
import { ApiError } from '@/server/http/apiError';
import { ActivityService } from './activity.service';
import type { SessionUser } from '@/server/types/session';
import type { Page, Pagination } from '@/server/types/pagination';

function isEditorPlus(role: SessionUser['role']): boolean {
  return role === 'EDITOR' || role === 'ADMIN';
}

export const RevisionService = {
  async list(
    contentId: string,
    p: Pagination,
    session: SessionUser,
  ): Promise<Page<Revision>> {
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content || content.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Content not found', 404);
    }
    if (!isEditorPlus(session.role) && content.authorId !== session.id) {
      throw new ApiError('FORBIDDEN', 'Cannot view revisions for this content', 403);
    }
    const skip = Math.max(0, (p.page - 1) * p.pageSize);
    const [items, total] = await Promise.all([
      prisma.revision.findMany({
        where: { contentId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: p.pageSize,
      }),
      prisma.revision.count({ where: { contentId } }),
    ]);
    return { items, total, page: p.page, pageSize: p.pageSize };
  },

  /**
   * Restore a target revision. In a single transaction:
   *   1. Snapshot the CURRENT content into a new Revision (so the in-flight
   *      state is preserved before being overwritten).
   *   2. Copy `(title, body, excerpt)` from the target revision back onto
   *      the Content row.
   */
  async restore(
    contentId: string,
    version: number,
    session: SessionUser,
  ): Promise<Content> {
    if (!isEditorPlus(session.role)) {
      throw new ApiError('FORBIDDEN', 'Only editors and admins may restore revisions', 403);
    }
    const target = await RevisionRepo.get(contentId, version);
    if (!target) {
      throw new ApiError('NOT_FOUND', 'Revision not found', 404);
    }
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content || content.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Content not found', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await RevisionRepo.appendFromContent(contentId, session.id, tx);
      return ContentRepo.update(
        contentId,
        {
          title: target.title,
          body: target.body,
          excerpt: target.excerpt,
        },
        session.id,
        tx,
      );
    });

    await ActivityService.record({
      actorId: session.id,
      action: 'content.restoreRevision',
      entityType: 'Content',
      entityId: contentId,
      metadata: { restoredVersion: version },
    });
    return updated;
  },
};
