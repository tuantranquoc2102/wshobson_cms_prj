import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/repos/content.repo', () => ({
  ContentRepo: {
    update: vi.fn(),
  },
}));
vi.mock('@/server/db/repos/revision.repo', () => ({
  RevisionRepo: {
    get: vi.fn(),
    appendFromContent: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/server/services/activity.service', () => ({
  ActivityService: { record: vi.fn().mockResolvedValue(undefined) },
}));

const findUnique = vi.fn();
const findMany = vi.fn();
const count = vi.fn();
const txCallback = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));

vi.mock('@/server/db/prisma', () => ({
  prisma: {
    content: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
    revision: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => txCallback(fn),
  },
}));

import { RevisionService } from '@/server/services/revision.service';
import { RevisionRepo } from '@/server/db/repos/revision.repo';
import { ContentRepo } from '@/server/db/repos/content.repo';
import type { SessionUser } from '@/server/types/session';

const editor: SessionUser = {
  id: 'u-editor',
  email: 'e@b',
  name: 'E',
  role: 'EDITOR',
};
const author: SessionUser = {
  id: 'u-author',
  email: 'a@b',
  name: 'A',
  role: 'AUTHOR',
};

const contentRow = {
  id: 'c1',
  authorId: 'u-author',
  status: 'DRAFT' as const,
  type: 'POST' as const,
  slug: 'hello',
  title: 'Current title',
  body: 'Current body',
  excerpt: 'Current excerpt',
  deletedAt: null,
};

const targetRevision = {
  id: 'r3',
  contentId: 'c1',
  version: 3,
  title: 'Old title',
  body: 'Old body',
  excerpt: 'Old excerpt',
  authorId: 'u-author',
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('RevisionService.restore', () => {
  it('snapshots current then writes target fields back to Content (in tx)', async () => {
    vi.mocked(RevisionRepo.get).mockResolvedValue(targetRevision);
    findUnique.mockResolvedValue(contentRow);
    vi.mocked(ContentRepo.update).mockResolvedValue({
      ...contentRow,
      title: 'Old title',
      body: 'Old body',
      excerpt: 'Old excerpt',
    } as never);

    const out = await RevisionService.restore('c1', 3, editor);

    expect(txCallback).toHaveBeenCalledOnce();
    // 1. Snapshot the current content first.
    expect(RevisionRepo.appendFromContent).toHaveBeenCalledWith(
      'c1',
      editor.id,
      expect.anything(),
    );
    // 2. Then patch Content with the target revision's fields.
    expect(ContentRepo.update).toHaveBeenCalledWith(
      'c1',
      { title: 'Old title', body: 'Old body', excerpt: 'Old excerpt' },
      editor.id,
      expect.anything(),
    );
    expect(out.title).toBe('Old title');
  });

  it('returns 404 for an unknown revision version', async () => {
    vi.mocked(RevisionRepo.get).mockResolvedValue(null);
    await expect(
      RevisionService.restore('c1', 999, editor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(RevisionRepo.appendFromContent).not.toHaveBeenCalled();
    expect(ContentRepo.update).not.toHaveBeenCalled();
  });

  it('forbids AUTHOR from restoring (editor-plus only)', async () => {
    await expect(
      RevisionService.restore('c1', 3, author),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(RevisionRepo.get).not.toHaveBeenCalled();
  });

  it('returns 404 when the parent content is soft-deleted', async () => {
    vi.mocked(RevisionRepo.get).mockResolvedValue(targetRevision);
    findUnique.mockResolvedValue({ ...contentRow, deletedAt: new Date() });
    await expect(
      RevisionService.restore('c1', 3, editor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});

describe('RevisionService.list', () => {
  it('returns a page when the caller can see the content', async () => {
    findUnique.mockResolvedValue(contentRow);
    findMany.mockResolvedValue([targetRevision]);
    count.mockResolvedValue(1);
    const page = await RevisionService.list(
      'c1',
      { page: 1, pageSize: 10 },
      editor,
    );
    expect(page.total).toBe(1);
    expect(page.items[0]?.version).toBe(3);
  });

  it('forbids non-owner AUTHORs from listing revisions', async () => {
    findUnique.mockResolvedValue({ ...contentRow, authorId: 'other' });
    await expect(
      RevisionService.list('c1', { page: 1, pageSize: 10 }, author),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });
});
