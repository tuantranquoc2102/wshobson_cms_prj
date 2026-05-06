import 'server-only';
import type { Prisma, Revision } from '@prisma/client';
import { prisma as defaultClient } from '@/server/db/prisma';

type Db = Prisma.TransactionClient | typeof defaultClient;

function db(tx?: Prisma.TransactionClient): Db {
  return tx ?? defaultClient;
}

export const RevisionRepo = {
  /** Most-recent-first revision history for a content item. */
  list(contentId: string, tx?: Prisma.TransactionClient): Promise<Revision[]> {
    return db(tx).revision.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Lookup a specific revision by `(contentId, version)`. */
  get(
    contentId: string,
    version: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Revision | null> {
    return db(tx).revision.findUnique({
      where: { contentId_version: { contentId, version } },
    });
  },

  /**
   * Snapshot the current Content row into a new Revision (version = next).
   * Called by ContentService.update before mutating the content.
   */
  async appendFromContent(
    contentId: string,
    actorId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Revision> {
    const client = db(tx);
    const content = await client.content.findUniqueOrThrow({
      where: { id: contentId },
      select: { title: true, body: true, excerpt: true },
    });
    const next = await this.nextVersion(contentId, tx);
    return client.revision.create({
      data: {
        contentId,
        version: next,
        title: content.title,
        body: content.body,
        excerpt: content.excerpt,
        authorId: actorId,
      },
    });
  },

  /** Compute the next monotonic version for a content item. */
  async nextVersion(
    contentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const latest = await db(tx).revision.findFirst({
      where: { contentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  },
};

export type RevisionRepoType = typeof RevisionRepo;
