import 'server-only';
import { Prisma, type Category, type Tag } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { TaxonomyRepo } from '@/server/db/repos/taxonomy.repo';
import { ApiError } from '@/server/http/apiError';
import { slugify } from '@/server/lib/slugify';
import { ActivityService } from './activity.service';
import type { CategoryInput, TagInput } from '@/server/schemas/taxonomy.schema';
import type { SessionUser } from '@/server/types/session';

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

async function categoryUsage(id: string): Promise<number> {
  return prisma.contentCategory.count({ where: { categoryId: id } });
}

async function tagUsage(id: string): Promise<number> {
  return prisma.contentTag.count({ where: { tagId: id } });
}

export const TaxonomyService = {
  // ── Categories ───────────────────────────────────────────

  listCategories(): Promise<Category[]> {
    return TaxonomyRepo.listCategories();
  },

  async createCategory(
    input: CategoryInput,
    session: SessionUser,
  ): Promise<Category> {
    const slug = input.slug ?? slugify(input.name);
    if (!slug) {
      throw new ApiError('UNPROCESSABLE', 'Slug could not be derived', 422);
    }
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ApiError('CONFLICT', 'Category slug already in use', 409, {
        slug: [`Slug already in use; suggestion: ${slug}-2`],
      });
    }
    try {
      const created = await prisma.category.create({
        data: { slug, name: input.name, description: input.description ?? null },
      });
      await ActivityService.record({
        actorId: session.id,
        action: 'category.create',
        entityType: 'Category',
        entityId: created.id,
      });
      return created;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ApiError('CONFLICT', 'Category slug already in use', 409);
      }
      throw err;
    }
  },

  async updateCategory(
    id: string,
    input: CategoryInput,
    session: SessionUser,
  ): Promise<Category> {
    const target = await prisma.category.findUnique({ where: { id } });
    if (!target) throw new ApiError('NOT_FOUND', 'Category not found', 404);
    const slug = input.slug ?? slugify(input.name);
    try {
      const updated = await prisma.category.update({
        where: { id },
        data: { name: input.name, slug, description: input.description ?? null },
      });
      await ActivityService.record({
        actorId: session.id,
        action: 'category.update',
        entityType: 'Category',
        entityId: id,
      });
      return updated;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ApiError('CONFLICT', 'Category slug already in use', 409);
      }
      throw err;
    }
  },

  async deleteCategory(id: string, session: SessionUser): Promise<void> {
    const target = await prisma.category.findUnique({ where: { id } });
    if (!target) throw new ApiError('NOT_FOUND', 'Category not found', 404);
    const usage = await categoryUsage(id);
    if (usage > 0) {
      throw new ApiError(
        'CONFLICT',
        'Category is in use and cannot be deleted',
        409,
      );
    }
    await prisma.category.delete({ where: { id } });
    await ActivityService.record({
      actorId: session.id,
      action: 'category.delete',
      entityType: 'Category',
      entityId: id,
    });
  },

  // ── Tags ────────────────────────────────────────────────

  listTags(): Promise<Tag[]> {
    return TaxonomyRepo.listTags();
  },

  async createTag(input: TagInput, session: SessionUser): Promise<Tag> {
    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw new ApiError('UNPROCESSABLE', 'Slug could not be derived', 422);
    const existing = await prisma.tag.findUnique({ where: { slug } });
    if (existing) {
      throw new ApiError('CONFLICT', 'Tag slug already in use', 409, {
        slug: [`Slug already in use; suggestion: ${slug}-2`],
      });
    }
    try {
      const created = await prisma.tag.create({
        data: { slug, name: input.name },
      });
      await ActivityService.record({
        actorId: session.id,
        action: 'tag.create',
        entityType: 'Tag',
        entityId: created.id,
      });
      return created;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ApiError('CONFLICT', 'Tag slug already in use', 409);
      }
      throw err;
    }
  },

  async updateTag(id: string, input: TagInput, session: SessionUser): Promise<Tag> {
    const target = await prisma.tag.findUnique({ where: { id } });
    if (!target) throw new ApiError('NOT_FOUND', 'Tag not found', 404);
    const slug = input.slug ?? slugify(input.name);
    try {
      const updated = await prisma.tag.update({
        where: { id },
        data: { name: input.name, slug },
      });
      await ActivityService.record({
        actorId: session.id,
        action: 'tag.update',
        entityType: 'Tag',
        entityId: id,
      });
      return updated;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ApiError('CONFLICT', 'Tag slug already in use', 409);
      }
      throw err;
    }
  },

  async deleteTag(id: string, session: SessionUser): Promise<void> {
    const target = await prisma.tag.findUnique({ where: { id } });
    if (!target) throw new ApiError('NOT_FOUND', 'Tag not found', 404);
    const usage = await tagUsage(id);
    if (usage > 0) {
      throw new ApiError('CONFLICT', 'Tag is in use and cannot be deleted', 409);
    }
    await prisma.tag.delete({ where: { id } });
    await ActivityService.record({
      actorId: session.id,
      action: 'tag.delete',
      entityType: 'Tag',
      entityId: id,
    });
  },
};
