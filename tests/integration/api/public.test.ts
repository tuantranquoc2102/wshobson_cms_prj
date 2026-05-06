/**
 * Public-feed integration test. Exercises the route handlers (which we
 * import directly) against a real Postgres pointed at `TEST_DATABASE_URL`.
 * Builds a fabricated `NextRequest` for each call.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { HAS_TEST_DB, getPrisma, resetDb, seedUser } from './_setup';
import type { SessionUser } from '@/server/types/session';

const maybe = HAS_TEST_DB ? describe : describe.skip;

maybe('Public API (integration)', () => {
  let editor: SessionUser;
  let publishedSlug: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-secret-test-secret-test-secret';
    await resetDb();
    const e = await seedUser({
      email: 'public-editor@example.com',
      password: 'pass1234',
      role: 'EDITOR',
      name: 'PubEditor',
    });
    editor = {
      id: e.id,
      email: 'public-editor@example.com',
      role: 'EDITOR',
      name: 'PubEditor',
    };

    const { ContentService } = await import('@/server/services/content.service');
    // One DRAFT (must NOT appear), one PUBLISHED (must appear).
    publishedSlug = `published-${Date.now()}`;
    const draft = await ContentService.create(
      {
        type: 'POST',
        title: 'Draft thing',
        body: 'should-be-hidden',
        slug: `draft-${Date.now()}`,
        categoryIds: [],
        tagIds: [],
      },
      editor,
    );
    void draft;
    const pub = await ContentService.create(
      {
        type: 'POST',
        title: 'Published thing',
        body: 'should-be-visible',
        slug: publishedSlug,
        categoryIds: [],
        tagIds: [],
      },
      editor,
    );
    await ContentService.transitionStatus(pub.id, 'PUBLISHED', editor);
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it('GET /api/public/posts returns only PUBLISHED posts', async () => {
    const { GET } = await import('@/app/api/public/posts/route');
    const req = new NextRequest(
      'http://localhost/api/public/posts?page=1&pageSize=50',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ slug: string; status: string }>;
      total: number;
    };
    expect(body.items.every((i) => i.status === 'PUBLISHED')).toBe(true);
    expect(body.items.find((i) => i.slug === publishedSlug)).toBeDefined();
    // Drafts must NOT leak into the public feed.
    expect(body.items.some((i) => i.slug.startsWith('draft-'))).toBe(false);
  });

  it('GET /api/public/posts/[slug] resolves a published post', async () => {
    const { GET } = await import('@/app/api/public/posts/[slug]/route');
    const req = new NextRequest(
      `http://localhost/api/public/posts/${publishedSlug}`,
    );
    const res = await GET(req, {
      params: Promise.resolve({ slug: publishedSlug }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      post: { slug: string; status: string };
      html: string;
    };
    expect(body.post.slug).toBe(publishedSlug);
    expect(body.post.status).toBe('PUBLISHED');
    expect(typeof body.html).toBe('string');
  });

  it('GET /api/public/posts/[slug] 404s for a draft slug', async () => {
    const { GET } = await import('@/app/api/public/posts/[slug]/route');
    const draftSlug = (await getPrisma().content.findFirst({
      where: { status: 'DRAFT' },
      select: { slug: true },
    }))?.slug;
    if (!draftSlug) throw new Error('expected a draft fixture');

    const res = await GET(
      new NextRequest(`http://localhost/api/public/posts/${draftSlug}`),
      { params: Promise.resolve({ slug: draftSlug }) },
    );
    expect(res.status).toBe(404);
  });
});
