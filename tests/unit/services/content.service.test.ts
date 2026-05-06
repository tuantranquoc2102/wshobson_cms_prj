import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/repos/content.repo', () => ({
  ContentRepo: {
    create: vi.fn(),
    update: vi.fn(),
    transitionStatus: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/server/db/repos/revision.repo', () => ({
  RevisionRepo: {
    appendFromContent: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/server/db/repos/taxonomy.repo', () => ({
  TaxonomyRepo: {
    setContentCategories: vi.fn().mockResolvedValue(undefined),
    setContentTags: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/server/services/activity.service', () => ({
  ActivityService: { record: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const findUnique = vi.fn();
const updateModel = vi.fn();
const findMany = vi.fn();
const count = vi.fn();
const txCallback = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));

vi.mock('@/server/db/prisma', () => ({
  prisma: {
    content: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => updateModel(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => txCallback(fn),
  },
}));

import { ContentService } from '@/server/services/content.service';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { RevisionRepo } from '@/server/db/repos/revision.repo';
import { Prisma } from '@prisma/client';
import type { SessionUser } from '@/server/types/session';

const author: SessionUser = {
  id: 'u-author',
  email: 'a@b',
  name: 'A',
  role: 'AUTHOR',
};
const editor: SessionUser = {
  id: 'u-editor',
  email: 'e@b',
  name: 'E',
  role: 'EDITOR',
};

const draftRow = {
  id: 'c1',
  authorId: 'u-author',
  status: 'DRAFT' as const,
  type: 'POST' as const,
  slug: 'hello',
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ContentService.transitionStatus', () => {
  it('AUTHOR can DRAFT → IN_REVIEW on own content', async () => {
    findUnique.mockResolvedValue(draftRow);
    vi.mocked(ContentRepo.transitionStatus).mockResolvedValue({
      ...draftRow,
      status: 'IN_REVIEW',
    } as never);
    const out = await ContentService.transitionStatus(
      'c1',
      'IN_REVIEW',
      author,
    );
    expect(out.status).toBe('IN_REVIEW');
  });

  it('AUTHOR cannot DRAFT → PUBLISHED', async () => {
    findUnique.mockResolvedValue(draftRow);
    await expect(
      ContentService.transitionStatus('c1', 'PUBLISHED', author),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('EDITOR cannot do an invalid transition (PUBLISHED → IN_REVIEW)', async () => {
    findUnique.mockResolvedValue({
      ...draftRow,
      status: 'PUBLISHED',
    });
    await expect(
      ContentService.transitionStatus('c1', 'IN_REVIEW', editor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('rejects same-state transition with 409', async () => {
    findUnique.mockResolvedValue(draftRow);
    await expect(
      ContentService.transitionStatus('c1', 'DRAFT', editor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('returns 404 if content is missing or soft-deleted', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      ContentService.transitionStatus('cZ', 'IN_REVIEW', author),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});

describe('ContentService.update', () => {
  it('snapshots a Revision before mutating, in a transaction', async () => {
    findUnique.mockResolvedValue(draftRow);
    vi.mocked(ContentRepo.update).mockResolvedValue({
      ...draftRow,
      title: 'New',
    } as never);

    await ContentService.update(
      'c1',
      { title: 'New' },
      author,
    );

    expect(txCallback).toHaveBeenCalledOnce();
    expect(RevisionRepo.appendFromContent).toHaveBeenCalledWith(
      'c1',
      'u-author',
      expect.anything(),
    );
    expect(ContentRepo.update).toHaveBeenCalled();
  });

  it('AUTHOR cannot edit non-DRAFT content', async () => {
    findUnique.mockResolvedValue({ ...draftRow, status: 'IN_REVIEW' });
    await expect(
      ContentService.update('c1', { title: 'New' }, author),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('AUTHOR cannot edit content owned by someone else', async () => {
    findUnique.mockResolvedValue({ ...draftRow, authorId: 'someone-else' });
    await expect(
      ContentService.update('c1', { title: 'New' }, author),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });
});

describe('ContentService.list visibility', () => {
  it('AUTHOR query is constrained to own content OR others-PUBLISHED', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    await ContentService.list(
      { page: 1, pageSize: 20 },
      author,
    );
    const arg = findMany.mock.calls[0]?.[0] as {
      where: { OR?: Array<Record<string, unknown>>; deletedAt: null };
    };
    expect(arg.where.deletedAt).toBeNull();
    // OR clause must contain BOTH "authorId == self" and "status == PUBLISHED"
    expect(arg.where.OR).toEqual(
      expect.arrayContaining([
        { authorId: author.id },
        { status: 'PUBLISHED' },
      ]),
    );
  });

  it('EDITOR query has no author/PUBLISHED OR clause appended', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    await ContentService.list(
      { page: 1, pageSize: 20 },
      editor,
    );
    const arg = findMany.mock.calls[0]?.[0] as {
      where: { OR?: Array<Record<string, unknown>> };
    };
    // EDITOR sees everything not soft-deleted; no role-derived OR added.
    expect(arg.where.OR).toBeUndefined();
  });
});

describe('ContentService.create', () => {
  // Build a P2002 error the same way Prisma surfaces it at runtime.
  function p2002(): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );
  }

  it('happy path: creates the row and records activity', async () => {
    vi.mocked(ContentRepo.create).mockResolvedValue({
      ...draftRow,
      id: 'c-new',
      slug: 'hello',
    } as never);
    const out = await ContentService.create(
      {
        type: 'POST',
        title: 'Hello',
        body: 'b',
        categoryIds: [],
        tagIds: [],
      },
      author,
    );
    expect(out.id).toBe('c-new');
    expect(ContentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'hello', authorId: author.id }),
    );
  });

  it('retries on P2002 with an incremented slug suffix', async () => {
    // First attempt collides with `hello`, second succeeds with `hello-2`.
    vi.mocked(ContentRepo.create)
      .mockRejectedValueOnce(p2002())
      .mockResolvedValueOnce({
        ...draftRow,
        id: 'c-retry',
        slug: 'hello-2',
      } as never);

    const out = await ContentService.create(
      {
        type: 'POST',
        title: 'Hello',
        body: 'b',
        categoryIds: [],
        tagIds: [],
      },
      author,
    );
    expect(out.slug).toBe('hello-2');
    expect(ContentRepo.create).toHaveBeenCalledTimes(2);
    const call2 = vi.mocked(ContentRepo.create).mock.calls[1]?.[0];
    expect(call2).toMatchObject({ slug: 'hello-2' });
  });

  it('rejects when slug cannot be derived from the title', async () => {
    await expect(
      ContentService.create(
        {
          type: 'POST',
          title: '!!!',
          body: 'b',
          categoryIds: [],
          tagIds: [],
        },
        author,
      ),
    ).rejects.toMatchObject({ code: 'UNPROCESSABLE', status: 422 });
  });
});

describe('ContentService.softDelete', () => {
  it('AUTHOR can soft-delete their own DRAFT', async () => {
    findUnique.mockResolvedValue(draftRow);
    await ContentService.softDelete('c1', author);
    expect(ContentRepo.softDelete).toHaveBeenCalledWith('c1');
  });

  it('AUTHOR cannot soft-delete a non-DRAFT (even if own)', async () => {
    findUnique.mockResolvedValue({ ...draftRow, status: 'IN_REVIEW' });
    await expect(
      ContentService.softDelete('c1', author),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(ContentRepo.softDelete).not.toHaveBeenCalled();
  });

  it('AUTHOR cannot soft-delete content owned by someone else', async () => {
    findUnique.mockResolvedValue({ ...draftRow, authorId: 'someone-else' });
    await expect(
      ContentService.softDelete('c1', author),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('EDITOR may soft-delete any (non-deleted) content', async () => {
    findUnique.mockResolvedValue({
      ...draftRow,
      authorId: 'someone-else',
      status: 'PUBLISHED',
    });
    await ContentService.softDelete('c1', editor);
    expect(ContentRepo.softDelete).toHaveBeenCalledWith('c1');
  });

  it('returns 404 when content is missing', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      ContentService.softDelete('cZ', editor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});
