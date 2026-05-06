import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/server/db/repos/content.repo', () => ({
  ContentRepo: {
    findScheduledDue: vi.fn(),
    publishScheduled: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/server/services/activity.service', () => ({
  ActivityService: { record: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const findMany = vi.fn();
vi.mock('@/server/db/prisma', () => ({
  prisma: {
    content: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));

import { PublishingService } from '@/server/services/publishing.service';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { revalidatePath } from 'next/cache';

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('PublishingService.runScheduledPublish', () => {
  it('returns zero when nothing is due (idempotent no-op)', async () => {
    vi.mocked(ContentRepo.findScheduledDue).mockResolvedValue([]);
    const out = await PublishingService.runScheduledPublish();
    expect(out).toEqual({ published: 0, ids: [] });
    expect(ContentRepo.publishScheduled).not.toHaveBeenCalled();
  });

  it('publishes due rows and returns count', async () => {
    vi.mocked(ContentRepo.findScheduledDue).mockResolvedValue([
      { id: 'c1', scheduledFor: new Date() },
      { id: 'c2', scheduledFor: new Date() },
    ]);
    findMany.mockResolvedValue([
      { id: 'c1', slug: 'a', type: 'POST', authorId: 'u1' },
      { id: 'c2', slug: 'b', type: 'PAGE', authorId: 'u2' },
    ]);
    const out = await PublishingService.runScheduledPublish();
    expect(out.published).toBe(2);
    expect(ContentRepo.publishScheduled).toHaveBeenCalledWith(
      ['c1', 'c2'],
      expect.anything(),
    );
  });

  it('is safe to call repeatedly when nothing changes', async () => {
    vi.mocked(ContentRepo.findScheduledDue).mockResolvedValue([]);
    await PublishingService.runScheduledPublish();
    await PublishingService.runScheduledPublish();
    expect(ContentRepo.publishScheduled).not.toHaveBeenCalled();
  });

  it('revalidates the right public path per type (POST → /blog, PAGE → /p)', async () => {
    vi.mocked(ContentRepo.findScheduledDue).mockResolvedValue([
      { id: 'c1', scheduledFor: new Date() },
      { id: 'c2', scheduledFor: new Date() },
    ]);
    findMany.mockResolvedValue([
      { id: 'c1', slug: 'a-post', type: 'POST', authorId: 'u1' },
      { id: 'c2', slug: 'a-page', type: 'PAGE', authorId: 'u2' },
    ]);

    await PublishingService.runScheduledPublish();

    expect(revalidatePath).toHaveBeenCalledWith('/blog/a-post');
    expect(revalidatePath).toHaveBeenCalledWith('/p/a-page');
    // And the homepage gets nuked at least once.
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('is idempotent across two consecutive runs with the same due set', async () => {
    // Run #1: 2 due rows.
    vi.mocked(ContentRepo.findScheduledDue).mockResolvedValueOnce([
      { id: 'c1', scheduledFor: new Date() },
    ]);
    findMany.mockResolvedValueOnce([
      { id: 'c1', slug: 'x', type: 'POST', authorId: 'u1' },
    ]);
    const first = await PublishingService.runScheduledPublish();
    expect(first.published).toBe(1);

    // Run #2: repo returns nothing because rows are already PUBLISHED.
    vi.mocked(ContentRepo.findScheduledDue).mockResolvedValueOnce([]);
    const second = await PublishingService.runScheduledPublish();
    expect(second.published).toBe(0);
    // publishScheduled was only called once total.
    expect(ContentRepo.publishScheduled).toHaveBeenCalledTimes(1);
  });
});
