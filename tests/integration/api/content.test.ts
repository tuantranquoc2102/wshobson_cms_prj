/**
 * Service-layer integration tests against a real Postgres
 * (`TEST_DATABASE_URL`). See `auth.test.ts` for the rationale on bypassing
 * route handlers.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HAS_TEST_DB, getPrisma, resetDb, seedUser } from './_setup';
import type { SessionUser } from '@/server/types/session';

const maybe = HAS_TEST_DB ? describe : describe.skip;

maybe('Content service (integration)', () => {
  let author: SessionUser;
  let editor: SessionUser;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-secret-test-secret-test-secret';
    await resetDb();
    const a = await seedUser({
      email: 'author@example.com',
      password: 'pass1234',
      role: 'AUTHOR',
      name: 'Author',
    });
    const e = await seedUser({
      email: 'editor@example.com',
      password: 'pass1234',
      role: 'EDITOR',
      name: 'Editor',
    });
    author = { id: a.id, email: 'author@example.com', role: 'AUTHOR', name: 'Author' };
    editor = { id: e.id, email: 'editor@example.com', role: 'EDITOR', name: 'Editor' };
  });
  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it('AUTHOR creates draft, EDITOR publishes', async () => {
    const { ContentService } = await import('@/server/services/content.service');
    const created = await ContentService.create(
      {
        type: 'POST',
        title: 'Hello World',
        body: '# hi',
        categoryIds: [],
        tagIds: [],
      },
      author,
    );
    expect(created.status).toBe('DRAFT');

    // AUTHOR cannot publish.
    await expect(
      ContentService.transitionStatus(created.id, 'PUBLISHED', author),
    ).rejects.toMatchObject({ status: 403 });

    const published = await ContentService.transitionStatus(
      created.id,
      'PUBLISHED',
      editor,
    );
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).not.toBeNull();
  });

  it('rejects an invalid state-machine transition with 409', async () => {
    const { ContentService } = await import('@/server/services/content.service');
    const created = await ContentService.create(
      {
        type: 'POST',
        title: 'Sm machine',
        body: 'x',
        categoryIds: [],
        tagIds: [],
      },
      editor,
    );
    await ContentService.transitionStatus(created.id, 'PUBLISHED', editor);
    // PUBLISHED → IN_REVIEW is not a valid edge.
    await expect(
      ContentService.transitionStatus(created.id, 'IN_REVIEW', editor),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('soft-deleted content is hidden from EDITOR listing', async () => {
    const { ContentService } = await import('@/server/services/content.service');
    const created = await ContentService.create(
      { type: 'POST', title: 'Goner', body: 'x', categoryIds: [], tagIds: [] },
      editor,
    );
    await ContentService.softDelete(created.id, editor);
    const page = await ContentService.list(
      { page: 1, pageSize: 100 },
      editor,
    );
    expect(page.items.find((p) => p.id === created.id)).toBeUndefined();
  });
});
