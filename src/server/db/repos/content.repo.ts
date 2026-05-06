import 'server-only';
import type {
  Category,
  Content,
  ContentCategory,
  ContentStatus,
  ContentTag,
  ContentType,
  Media,
  Prisma,
  Tag,
  User,
} from '@prisma/client';
import { prisma as defaultClient } from '@/server/db/prisma';
import type { Pagination } from '@/server/types/pagination';
import { toSkip } from '@/server/types/pagination';

type Db = Prisma.TransactionClient | typeof defaultClient;

function db(tx?: Prisma.TransactionClient): Db {
  return tx ?? defaultClient;
}

/**
 * Hydrated Content row used by public listing/detail endpoints.
 * Mirrors the include-shape in `.full-stack-feature/02-database-design.md` §6.
 */
export type ContentWithRelations = Content & {
  author: Pick<User, 'id' | 'name'>;
  featuredMedia: Media | null;
  categories: (ContentCategory & { category: Category })[];
  tags: (ContentTag & { tag: Tag })[];
};

export type CreateContentInput = {
  type: ContentType;
  slug: string;
  title: string;
  body: string;
  authorId: string;
  excerpt?: string | null;
  status?: ContentStatus;
  publishedAt?: Date | null;
  scheduledFor?: Date | null;
  featuredMediaId?: string | null;
};

export type UpdateContentInput = {
  title?: string;
  slug?: string;
  body?: string;
  excerpt?: string | null;
  publishedAt?: Date | null;
  scheduledFor?: Date | null;
  featuredMediaId?: string | null;
};

const PUBLIC_INCLUDE = {
  author: { select: { id: true, name: true } },
  featuredMedia: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ContentInclude;

// Card-shape for list endpoints. Excludes `body` (often large markdown) to
// keep payloads small — detail endpoints use PUBLIC_INCLUDE instead.
const LIST_SELECT = {
  id: true,
  type: true,
  slug: true,
  title: true,
  excerpt: true,
  status: true,
  publishedAt: true,
  scheduledFor: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  featuredMediaId: true,
  deletedAt: true,
  author: { select: { id: true, name: true } },
  featuredMedia: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ContentSelect;

export type ContentListItem = Omit<ContentWithRelations, 'body'>;

export const ContentRepo = {
  /** Public homepage feed — only PUBLISHED, non-soft-deleted POSTs whose `publishedAt` has elapsed. */
  listPublicHomepage(
    p: Pagination,
    tx?: Prisma.TransactionClient,
  ): Promise<ContentListItem[]> {
    return db(tx).content.findMany({
      where: {
        type: 'POST',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
      },
      orderBy: { publishedAt: 'desc' },
      skip: toSkip(p),
      take: p.pageSize,
      select: LIST_SELECT,
    }) as Promise<ContentListItem[]>;
  },

  /** Public category-page feed. */
  listPublicByCategory(
    categorySlug: string,
    p: Pagination,
    tx?: Prisma.TransactionClient,
  ): Promise<ContentListItem[]> {
    return db(tx).content.findMany({
      where: {
        type: 'POST',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
        categories: { some: { category: { slug: categorySlug } } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: toSkip(p),
      take: p.pageSize,
      select: LIST_SELECT,
    }) as Promise<ContentListItem[]>;
  },

  /** Author dashboard — current user's drafts. */
  listMyDrafts(authorId: string, tx?: Prisma.TransactionClient): Promise<Content[]> {
    return db(tx).content.findMany({
      where: { authorId, status: 'DRAFT', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  },

  /** Editor review queue — oldest first for fairness. */
  listReviewQueue(
    tx?: Prisma.TransactionClient,
  ): Promise<(Content & { author: Pick<User, 'id' | 'name'> })[]> {
    return db(tx).content.findMany({
      where: { status: 'IN_REVIEW', deletedAt: null },
      orderBy: { updatedAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    }) as Promise<(Content & { author: Pick<User, 'id' | 'name'> })[]>;
  },

  /** Single public-facing post lookup by slug. Hides drafts/scheduled. */
  getPublicBySlug(
    slug: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ContentWithRelations | null> {
    return db(tx).content.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
      },
      include: PUBLIC_INCLUDE,
    }) as Promise<ContentWithRelations | null>;
  },

  /** Cron query: which scheduled items are due to publish? */
  findScheduledDue(
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Pick<Content, 'id' | 'scheduledFor'>[]> {
    return db(tx).content.findMany({
      where: {
        status: { in: ['DRAFT', 'IN_REVIEW'] },
        scheduledFor: { lte: now, not: null },
        deletedAt: null,
      },
      select: { id: true, scheduledFor: true },
    });
  },

  /**
   * Bulk-publish the supplied due items. We re-read each row's
   * `scheduledFor` so `publishedAt` matches the originally-intended time.
   */
  async publishScheduled(ids: string[], tx?: Prisma.TransactionClient): Promise<void> {
    if (ids.length === 0) return;
    const rows = await db(tx).content.findMany({
      where: { id: { in: ids } },
      select: { id: true, scheduledFor: true },
    });
    for (const row of rows) {
      await db(tx).content.update({
        where: { id: row.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: row.scheduledFor ?? new Date(),
          scheduledFor: null,
        },
      });
    }
  },

  create(input: CreateContentInput, tx?: Prisma.TransactionClient): Promise<Content> {
    return db(tx).content.create({
      data: {
        type: input.type,
        slug: input.slug,
        title: input.title,
        body: input.body,
        authorId: input.authorId,
        excerpt: input.excerpt ?? null,
        status: input.status ?? 'DRAFT',
        publishedAt: input.publishedAt ?? null,
        scheduledFor: input.scheduledFor ?? null,
        featuredMediaId: input.featuredMediaId ?? null,
      },
    });
  },

  /**
   * Patch an existing content row. The `actorId` is not stored on Content
   * directly — the service layer threads it through to ActivityLog and
   * Revision writes.
   */
  update(
    id: string,
    input: UpdateContentInput,
    _actorId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Content> {
    const data: Prisma.ContentUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.body !== undefined) data.body = input.body;
    if (input.excerpt !== undefined) data.excerpt = input.excerpt;
    if (input.publishedAt !== undefined) data.publishedAt = input.publishedAt;
    if (input.scheduledFor !== undefined) data.scheduledFor = input.scheduledFor;
    if (input.featuredMediaId !== undefined) {
      data.featuredMedia =
        input.featuredMediaId === null
          ? { disconnect: true }
          : { connect: { id: input.featuredMediaId } };
    }
    return db(tx).content.update({ where: { id }, data });
  },

  /**
   * State-machine transition. The service layer is responsible for
   * validating which (from, to, role) edges are legal. Entering
   * `PUBLISHED` sets `publishedAt = now()` if not already set, and clears
   * `scheduledFor`.
   */
  transitionStatus(
    id: string,
    next: ContentStatus,
    _actorId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Content> {
    const data: Prisma.ContentUpdateInput = { status: next };
    if (next === 'PUBLISHED') {
      data.publishedAt = new Date();
      data.scheduledFor = null;
    }
    return db(tx).content.update({ where: { id }, data });
  },

  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).content.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};

export type ContentRepoType = typeof ContentRepo;
