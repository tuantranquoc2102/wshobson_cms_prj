import 'server-only';
import {
  Prisma,
  type Content,
  type ContentStatus,
  type Role,
} from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import {
  ContentRepo,
  type ContentWithRelations,
} from '@/server/db/repos/content.repo';
import { RevisionRepo } from '@/server/db/repos/revision.repo';
import { TaxonomyRepo } from '@/server/db/repos/taxonomy.repo';
import { ApiError } from '@/server/http/apiError';
import { slugify } from '@/server/lib/slugify';
import { ActivityService } from './activity.service';
import type {
  CreateContentInput,
  UpdateContentInput,
  ContentListQuery,
} from '@/server/schemas/content.schema';
import type { SessionUser } from '@/server/types/session';
import type { Page } from '@/server/types/pagination';

// ─────────────────────────── State Machine ───────────────────────────

type Transition = { from: ContentStatus; to: ContentStatus; roles: Role[] };

const TRANSITIONS: Transition[] = [
  // From DRAFT
  { from: 'DRAFT', to: 'IN_REVIEW', roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
  { from: 'DRAFT', to: 'ARCHIVED', roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
  { from: 'DRAFT', to: 'PUBLISHED', roles: ['EDITOR', 'ADMIN'] },
  // From IN_REVIEW
  { from: 'IN_REVIEW', to: 'DRAFT', roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
  { from: 'IN_REVIEW', to: 'PUBLISHED', roles: ['EDITOR', 'ADMIN'] },
  { from: 'IN_REVIEW', to: 'ARCHIVED', roles: ['EDITOR', 'ADMIN'] },
  // From PUBLISHED
  { from: 'PUBLISHED', to: 'ARCHIVED', roles: ['EDITOR', 'ADMIN'] },
  { from: 'PUBLISHED', to: 'DRAFT', roles: ['EDITOR', 'ADMIN'] },
  // From ARCHIVED
  { from: 'ARCHIVED', to: 'DRAFT', roles: ['EDITOR', 'ADMIN'] },
];

function findTransition(
  from: ContentStatus,
  to: ContentStatus,
): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

// ─────────────────────────── Helpers ───────────────────────────

function isPrismaUniqueViolation(err: unknown): err is { code: 'P2002' } {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

/**
 * Insert content with `desiredSlug`, retrying with `-2`, `-3` … on slug
 * conflicts up to a small bound.
 */
async function createWithSlugRetry(
  base: Omit<CreateContentInput, 'slug' | 'categoryIds' | 'tagIds'> & {
    authorId: string;
    desiredSlug: string;
  },
): Promise<Content> {
  const MAX_TRIES = 8;
  let candidate = base.desiredSlug;
  for (let i = 1; i <= MAX_TRIES; i++) {
    try {
      return await ContentRepo.create({
        type: base.type,
        title: base.title,
        body: base.body,
        excerpt: base.excerpt ?? null,
        featuredMediaId: base.featuredMediaId ?? null,
        authorId: base.authorId,
        slug: candidate,
      });
    } catch (err) {
      if (isPrismaUniqueViolation(err) && i < MAX_TRIES) {
        candidate = `${base.desiredSlug}-${i + 1}`;
        continue;
      }
      if (isPrismaUniqueViolation(err)) {
        throw new ApiError(
          'CONFLICT',
          'Slug already in use',
          409,
          { slug: [`Slug already in use; suggestion: ${candidate}-${i + 1}`] },
        );
      }
      throw err;
    }
  }
  throw new ApiError('CONFLICT', 'Could not allocate a unique slug', 409);
}

function canSeeAsAuthor(c: Content, userId: string): boolean {
  if (c.deletedAt) return false;
  if (c.authorId === userId) return true;
  return c.status === 'PUBLISHED';
}

function isEditorPlus(role: Role): boolean {
  return role === 'EDITOR' || role === 'ADMIN';
}

// ─────────────────────────── Service ───────────────────────────

export const ContentService = {
  /**
   * Visibility-filtered list. AUTHOR sees own + others' PUBLISHED;
   * EDITOR/ADMIN see everything except soft-deleted.
   */
  async list(
    filters: ContentListQuery,
    session: SessionUser,
  ): Promise<Page<ContentWithRelations>> {
    const where: Prisma.ContentWhereInput = { deletedAt: null };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.categoryId) {
      where.categories = { some: { categoryId: filters.categoryId } };
    }
    if (filters.tagId) {
      where.tags = { some: { tagId: filters.tagId } };
    }
    const andClauses: Prisma.ContentWhereInput[] = [];
    if (filters.q) {
      andClauses.push({
        OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { excerpt: { contains: filters.q, mode: 'insensitive' } },
        ],
      });
    }
    if (!isEditorPlus(session.role)) {
      // AUTHOR: own (any status) OR others' PUBLISHED.
      andClauses.push({
        OR: [{ authorId: session.id }, { status: 'PUBLISHED' }],
      });
    }
    if (andClauses.length > 0) where.AND = andClauses;

    const skip = Math.max(0, (filters.page - 1) * filters.pageSize);
    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: filters.pageSize,
        include: {
          author: { select: { id: true, name: true } },
          featuredMedia: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      }) as Promise<ContentWithRelations[]>,
      prisma.content.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  },

  async getById(
    id: string,
    session: SessionUser,
  ): Promise<ContentWithRelations> {
    const c = (await prisma.content.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        featuredMedia: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    })) as ContentWithRelations | null;
    if (!c || c.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Content not found', 404);
    }
    if (!isEditorPlus(session.role) && !canSeeAsAuthor(c, session.id)) {
      throw new ApiError('FORBIDDEN', 'Cannot view this content', 403);
    }
    return c;
  },

  async create(
    input: CreateContentInput,
    session: SessionUser,
  ): Promise<Content> {
    const desiredSlug = input.slug ?? slugify(input.title);
    if (!desiredSlug) {
      throw new ApiError('UNPROCESSABLE', 'Could not derive a slug from title', 422, {
        slug: ['Slug is required and could not be derived from the title'],
      });
    }

    // Slug retry happens outside a tx — Prisma cannot continue a tx after
    // a constraint failure, and the slug suffix loop is naturally
    // idempotent at the row level.
    const row = await createWithSlugRetry({
      type: input.type,
      title: input.title,
      body: input.body,
      excerpt: input.excerpt,
      featuredMediaId: input.featuredMediaId,
      authorId: session.id,
      desiredSlug,
    });

    if (input.categoryIds.length > 0 || input.tagIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        if (input.categoryIds.length > 0) {
          await TaxonomyRepo.setContentCategories(row.id, input.categoryIds, tx);
        }
        if (input.tagIds.length > 0) {
          await TaxonomyRepo.setContentTags(row.id, input.tagIds, tx);
        }
      });
    }

    await ActivityService.record({
      actorId: session.id,
      action: 'content.create',
      entityType: 'Content',
      entityId: row.id,
      metadata: { type: row.type, slug: row.slug },
    });
    return row;
  },

  /**
   * Patch a Content row. Snapshots the *current* state into a Revision
   * inside a transaction before the mutation lands, so the revision history
   * captures pre-edit content. Strips any `status` from the input — status
   * may only change via `transitionStatus`.
   */
  async update(
    id: string,
    input: UpdateContentInput,
    session: SessionUser,
  ): Promise<Content> {
    const current = await prisma.content.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Content not found', 404);
    }
    // Authorization: AUTHOR may only edit own DRAFT; EDITOR+ can edit any.
    if (!isEditorPlus(session.role)) {
      if (current.authorId !== session.id) {
        throw new ApiError('FORBIDDEN', 'Cannot edit content you do not own', 403);
      }
      if (current.status !== 'DRAFT') {
        throw new ApiError(
          'FORBIDDEN',
          'Authors may only edit DRAFT content',
          403,
        );
      }
    }

    const desiredSlug =
      input.slug !== undefined ? input.slug : undefined;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Snapshot CURRENT content into a new Revision row.
        await RevisionRepo.appendFromContent(id, session.id, tx);

        // 2. Patch the content row.
        const updated = await ContentRepo.update(
          id,
          {
            title: input.title,
            slug: desiredSlug,
            body: input.body,
            excerpt: input.excerpt ?? undefined,
            featuredMediaId: input.featuredMediaId ?? undefined,
          },
          session.id,
          tx,
        );

        // 3. If category/tag arrays were supplied, sync them.
        if (input.categoryIds !== undefined) {
          await TaxonomyRepo.setContentCategories(id, input.categoryIds, tx);
        }
        if (input.tagIds !== undefined) {
          await TaxonomyRepo.setContentTags(id, input.tagIds, tx);
        }
        return updated;
      });

      await ActivityService.record({
        actorId: session.id,
        action: 'content.update',
        entityType: 'Content',
        entityId: id,
      });
      return result;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ApiError('CONFLICT', 'Slug already in use', 409, {
          slug: ['Slug already in use'],
        });
      }
      throw err;
    }
  },

  async transitionStatus(
    id: string,
    to: ContentStatus,
    session: SessionUser,
  ): Promise<Content> {
    const current = await prisma.content.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Content not found', 404);
    }
    if (current.status === to) {
      throw new ApiError(
        'CONFLICT',
        `Content is already ${to}`,
        409,
      );
    }

    const transition = findTransition(current.status, to);
    if (!transition) {
      throw new ApiError(
        'CONFLICT',
        `Invalid transition: ${current.status} → ${to}`,
        409,
      );
    }

    // Authors may only transition their own content; the role list inside
    // the transition entry does the rest of the gating.
    const isAuthorActor = session.role === 'AUTHOR';
    if (isAuthorActor && current.authorId !== session.id) {
      throw new ApiError('FORBIDDEN', 'Authors may only transition their own content', 403);
    }
    if (!transition.roles.includes(session.role)) {
      throw new ApiError('FORBIDDEN', 'Insufficient role for this transition', 403);
    }

    const updated = await ContentRepo.transitionStatus(id, to, session.id);

    // Best-effort revalidation of the public surfaces.
    try {
      const { revalidatePath } = await import('next/cache');
      if (updated.type === 'POST') {
        revalidatePath(`/blog/${updated.slug}`);
      } else {
        revalidatePath(`/p/${updated.slug}`);
      }
      revalidatePath('/');
    } catch {
      // Outside a server-rendering context (e.g. unit tests) — ignore.
    }

    await ActivityService.record({
      actorId: session.id,
      action: 'content.transition',
      entityType: 'Content',
      entityId: id,
      metadata: { from: current.status, to },
    });
    return updated;
  },

  async schedule(
    id: string,
    when: Date,
    session: SessionUser,
  ): Promise<Content> {
    if (!isEditorPlus(session.role)) {
      throw new ApiError('FORBIDDEN', 'Only editors and admins may schedule content', 403);
    }
    const current = await prisma.content.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Content not found', 404);
    }
    if (current.status !== 'DRAFT' && current.status !== 'IN_REVIEW') {
      throw new ApiError(
        'CONFLICT',
        'Only DRAFT or IN_REVIEW content may be scheduled',
        409,
      );
    }
    if (when.getTime() <= Date.now()) {
      throw new ApiError('UNPROCESSABLE', 'Scheduled date must be in the future', 422, {
        scheduledFor: ['Must be in the future'],
      });
    }

    const updated = await prisma.content.update({
      where: { id },
      data: { scheduledFor: when },
    });
    await ActivityService.record({
      actorId: session.id,
      action: 'content.schedule',
      entityType: 'Content',
      entityId: id,
      metadata: { scheduledFor: when.toISOString() },
    });
    return updated;
  },

  async softDelete(id: string, session: SessionUser): Promise<void> {
    const current = await prisma.content.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Content not found', 404);
    }
    const isAuthorOwnedDraft =
      current.authorId === session.id && current.status === 'DRAFT';
    if (!isEditorPlus(session.role) && !isAuthorOwnedDraft) {
      throw new ApiError('FORBIDDEN', 'Cannot delete this content', 403);
    }
    await ContentRepo.softDelete(id);
    await ActivityService.record({
      actorId: session.id,
      action: 'content.delete',
      entityType: 'Content',
      entityId: id,
    });
  },
};
