import 'server-only';
import type { Category, Prisma, Tag } from '@prisma/client';
import { prisma as defaultClient } from '@/server/db/prisma';

type Db = Prisma.TransactionClient | typeof defaultClient;

function db(tx?: Prisma.TransactionClient): Db {
  return tx ?? defaultClient;
}

export const TaxonomyRepo = {
  // ── Categories ──────────────────────────────────────────────

  listCategories(tx?: Prisma.TransactionClient): Promise<Category[]> {
    return db(tx).category.findMany({ orderBy: { name: 'asc' } });
  },

  upsertCategory(
    input: { slug: string; name: string; description?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Category> {
    return db(tx).category.upsert({
      where: { slug: input.slug },
      update: { name: input.name, description: input.description ?? null },
      create: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
      },
    });
  },

  /**
   * Replace the set of categories on a content item.
   * Removes any existing joins not in `categoryIds`, then adds new ones.
   * Both halves run on the supplied `tx` so the swap is atomic.
   */
  async setContentCategories(
    contentId: string,
    categoryIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = db(tx);
    if (categoryIds.length === 0) {
      await client.contentCategory.deleteMany({ where: { contentId } });
      return;
    }
    await client.contentCategory.deleteMany({
      where: { contentId, categoryId: { notIn: categoryIds } },
    });
    await client.contentCategory.createMany({
      data: categoryIds.map((categoryId) => ({ contentId, categoryId })),
      skipDuplicates: true,
    });
  },

  // ── Tags ────────────────────────────────────────────────────

  listTags(tx?: Prisma.TransactionClient): Promise<Tag[]> {
    return db(tx).tag.findMany({ orderBy: { name: 'asc' } });
  },

  upsertTag(
    input: { slug: string; name: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Tag> {
    return db(tx).tag.upsert({
      where: { slug: input.slug },
      update: { name: input.name },
      create: { slug: input.slug, name: input.name },
    });
  },

  /** Replace the set of tags on a content item. */
  async setContentTags(
    contentId: string,
    tagIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = db(tx);
    if (tagIds.length === 0) {
      await client.contentTag.deleteMany({ where: { contentId } });
      return;
    }
    await client.contentTag.deleteMany({
      where: { contentId, tagId: { notIn: tagIds } },
    });
    await client.contentTag.createMany({
      data: tagIds.map((tagId) => ({ contentId, tagId })),
      skipDuplicates: true,
    });
  },
};

export type TaxonomyRepoType = typeof TaxonomyRepo;
