/**
 * Taxonomy service-layer integration test against a real Postgres
 * (`TEST_DATABASE_URL`). See `auth.test.ts` for the rationale on bypassing
 * route handlers.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HAS_TEST_DB, getPrisma, resetDb, seedUser } from './_setup';
import type { SessionUser } from '@/server/types/session';

const maybe = HAS_TEST_DB ? describe : describe.skip;

maybe('Taxonomy service (integration)', () => {
  let editor: SessionUser;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-secret-test-secret-test-secret';
    await resetDb();
    const e = await seedUser({
      email: 'editor-tax@example.com',
      password: 'pass1234',
      role: 'EDITOR',
      name: 'TaxEditor',
    });
    editor = {
      id: e.id,
      email: 'editor-tax@example.com',
      role: 'EDITOR',
      name: 'TaxEditor',
    };
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it('createCategory derives a slug and rejects duplicates', async () => {
    const { TaxonomyService } = await import(
      '@/server/services/taxonomy.service'
    );
    const c1 = await TaxonomyService.createCategory(
      { name: 'Engineering' },
      editor,
    );
    expect(c1.slug).toBe('engineering');

    await expect(
      TaxonomyService.createCategory({ name: 'Engineering' }, editor),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('deleteCategory blocks with 409 when the category is used by content', async () => {
    const { TaxonomyService } = await import(
      '@/server/services/taxonomy.service'
    );
    const { ContentService } = await import('@/server/services/content.service');

    const cat = await TaxonomyService.createCategory(
      { name: 'In Use' },
      editor,
    );
    const post = await ContentService.create(
      {
        type: 'POST',
        title: 'Tagged post',
        body: 'b',
        categoryIds: [cat.id],
        tagIds: [],
      },
      editor,
    );

    await expect(
      TaxonomyService.deleteCategory(cat.id, editor),
    ).rejects.toMatchObject({ status: 409 });

    // Detach and try again — should succeed.
    await ContentService.update(post.id, { categoryIds: [] }, editor);
    await TaxonomyService.deleteCategory(cat.id, editor);
    const remaining = await getPrisma().category.findUnique({
      where: { id: cat.id },
    });
    expect(remaining).toBeNull();
  });

  it('createTag and deleteTag round-trip', async () => {
    const { TaxonomyService } = await import(
      '@/server/services/taxonomy.service'
    );
    const t = await TaxonomyService.createTag({ name: 'TypeScript' }, editor);
    expect(t.slug).toBe('typescript');
    await TaxonomyService.deleteTag(t.id, editor);
    const remaining = await getPrisma().tag.findUnique({ where: { id: t.id } });
    expect(remaining).toBeNull();
  });
});
