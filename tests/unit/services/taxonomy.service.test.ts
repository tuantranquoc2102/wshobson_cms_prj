import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/repos/taxonomy.repo', () => ({
  TaxonomyRepo: {
    listCategories: vi.fn().mockResolvedValue([]),
    listTags: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/server/services/activity.service', () => ({
  ActivityService: { record: vi.fn().mockResolvedValue(undefined) },
}));

const categoryFindUnique = vi.fn();
const categoryCreate = vi.fn();
const categoryUpdate = vi.fn();
const categoryDelete = vi.fn();
const tagFindUnique = vi.fn();
const tagCreate = vi.fn();
const tagDelete = vi.fn();
const contentCategoryCount = vi.fn();
const contentTagCount = vi.fn();

vi.mock('@/server/db/prisma', () => ({
  prisma: {
    category: {
      findUnique: (...a: unknown[]) => categoryFindUnique(...a),
      create: (...a: unknown[]) => categoryCreate(...a),
      update: (...a: unknown[]) => categoryUpdate(...a),
      delete: (...a: unknown[]) => categoryDelete(...a),
    },
    tag: {
      findUnique: (...a: unknown[]) => tagFindUnique(...a),
      create: (...a: unknown[]) => tagCreate(...a),
      delete: (...a: unknown[]) => tagDelete(...a),
    },
    contentCategory: {
      count: (...a: unknown[]) => contentCategoryCount(...a),
    },
    contentTag: {
      count: (...a: unknown[]) => contentTagCount(...a),
    },
  },
}));

import { TaxonomyService } from '@/server/services/taxonomy.service';
import type { SessionUser } from '@/server/types/session';

const editor: SessionUser = {
  id: 'u-editor',
  email: 'e@b',
  name: 'E',
  role: 'EDITOR',
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('TaxonomyService.deleteCategory', () => {
  it('blocks deletion with 409 when the category is in use', async () => {
    categoryFindUnique.mockResolvedValue({ id: 'cat1', slug: 'eng' });
    contentCategoryCount.mockResolvedValue(3);

    await expect(
      TaxonomyService.deleteCategory('cat1', editor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(categoryDelete).not.toHaveBeenCalled();
  });

  it('deletes when the category has zero usages', async () => {
    categoryFindUnique.mockResolvedValue({ id: 'cat1', slug: 'eng' });
    contentCategoryCount.mockResolvedValue(0);
    categoryDelete.mockResolvedValue({ id: 'cat1' });

    await TaxonomyService.deleteCategory('cat1', editor);
    expect(categoryDelete).toHaveBeenCalledWith({ where: { id: 'cat1' } });
  });

  it('returns 404 for an unknown category', async () => {
    categoryFindUnique.mockResolvedValue(null);
    await expect(
      TaxonomyService.deleteCategory('missing', editor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});

describe('TaxonomyService.deleteTag', () => {
  it('deletes a tag with no usages', async () => {
    tagFindUnique.mockResolvedValue({ id: 't1', slug: 'ts' });
    contentTagCount.mockResolvedValue(0);
    tagDelete.mockResolvedValue({ id: 't1' });

    await TaxonomyService.deleteTag('t1', editor);
    expect(tagDelete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('returns 404 for an unknown tag', async () => {
    tagFindUnique.mockResolvedValue(null);
    await expect(
      TaxonomyService.deleteTag('missing', editor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});

describe('TaxonomyService.updateCategory slug derivation', () => {
  it('derives a slug from the name when none is supplied', async () => {
    categoryFindUnique.mockResolvedValue({ id: 'cat1' });
    categoryUpdate.mockResolvedValue({ id: 'cat1', slug: 'web-development' });
    await TaxonomyService.updateCategory(
      'cat1',
      { name: 'Web Development!' },
      editor,
    );
    const arg = categoryUpdate.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { slug: string };
    };
    expect(arg.where).toEqual({ id: 'cat1' });
    expect(arg.data.slug).toBe('web-development');
  });

  it('uses the explicitly provided slug verbatim', async () => {
    categoryFindUnique.mockResolvedValue({ id: 'cat1' });
    categoryUpdate.mockResolvedValue({ id: 'cat1', slug: 'manual-slug' });
    await TaxonomyService.updateCategory(
      'cat1',
      { name: 'Anything', slug: 'manual-slug' },
      editor,
    );
    const arg = categoryUpdate.mock.calls[0]?.[0] as {
      data: { slug: string };
    };
    expect(arg.data.slug).toBe('manual-slug');
  });

  it('returns 404 when the category is missing', async () => {
    categoryFindUnique.mockResolvedValue(null);
    await expect(
      TaxonomyService.updateCategory('cat-missing', { name: 'X' }, editor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});

describe('TaxonomyService.createCategory / createTag', () => {
  it('createCategory rejects duplicate slug with 409', async () => {
    categoryFindUnique.mockResolvedValue({ id: 'existing', slug: 'eng' });
    await expect(
      TaxonomyService.createCategory({ name: 'Engineering' }, editor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(categoryCreate).not.toHaveBeenCalled();
  });

  it('createTag derives a slug and creates', async () => {
    tagFindUnique.mockResolvedValue(null);
    tagCreate.mockResolvedValue({ id: 't1', slug: 'typescript', name: 'TypeScript' });
    const out = await TaxonomyService.createTag({ name: 'TypeScript' }, editor);
    expect(out.id).toBe('t1');
    expect(tagCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { slug: 'typescript', name: 'TypeScript' } }),
    );
  });
});
