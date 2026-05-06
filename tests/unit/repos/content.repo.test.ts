import { describe, expect, it } from 'vitest';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { asTx, makePrismaStub } from './_mockPrisma';

describe('ContentRepo', () => {
  it('listPublicHomepage filters to PUBLISHED POSTs and selects card fields without body', async () => {
    const stub = makePrismaStub();
    stub.content.findMany.mockResolvedValue([]);
    await ContentRepo.listPublicHomepage({ page: 2, pageSize: 10 }, asTx(stub));
    const arg = stub.content.findMany.mock.calls[0]?.[0] as {
      where: { type: string; status: string; deletedAt: null };
      orderBy: unknown;
      skip: number;
      take: number;
      select: Record<string, unknown>;
    };
    expect(arg.where.type).toBe('POST');
    expect(arg.where.status).toBe('PUBLISHED');
    expect(arg.where.deletedAt).toBeNull();
    expect(arg.skip).toBe(10);
    expect(arg.take).toBe(10);
    expect(arg.select).toMatchObject({
      author: { select: { id: true, name: true } },
      featuredMedia: true,
    });
    expect((arg.select as Record<string, unknown>).body).toBeUndefined();
  });

  it('listPublicByCategory adds a categories.some filter', async () => {
    const stub = makePrismaStub();
    stub.content.findMany.mockResolvedValue([]);
    await ContentRepo.listPublicByCategory('engineering', { page: 1, pageSize: 20 }, asTx(stub));
    const arg = stub.content.findMany.mock.calls[0]?.[0] as {
      where: { categories: { some: { category: { slug: string } } } };
    };
    expect(arg.where.categories).toEqual({ some: { category: { slug: 'engineering' } } });
  });

  it('listMyDrafts filters to author + DRAFT', async () => {
    const stub = makePrismaStub();
    await ContentRepo.listMyDrafts('u1', asTx(stub));
    expect(stub.content.findMany).toHaveBeenCalledWith({
      where: { authorId: 'u1', status: 'DRAFT', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('listReviewQueue orders oldest-first for fairness', async () => {
    const stub = makePrismaStub();
    await ContentRepo.listReviewQueue(asTx(stub));
    const arg = stub.content.findMany.mock.calls[0]?.[0] as {
      where: { status: string };
      orderBy: { updatedAt: string };
    };
    expect(arg.where.status).toBe('IN_REVIEW');
    expect(arg.orderBy).toEqual({ updatedAt: 'asc' });
  });

  it('getPublicBySlug requires PUBLISHED + non-deleted', async () => {
    const stub = makePrismaStub();
    await ContentRepo.getPublicBySlug('hello', asTx(stub));
    const arg = stub.content.findFirst.mock.calls[0]?.[0] as {
      where: { slug: string; status: string; deletedAt: null };
    };
    expect(arg.where.slug).toBe('hello');
    expect(arg.where.status).toBe('PUBLISHED');
    expect(arg.where.deletedAt).toBeNull();
  });

  it('findScheduledDue selects DRAFT/IN_REVIEW past their scheduledFor', async () => {
    const stub = makePrismaStub();
    stub.content.findMany.mockResolvedValue([]);
    const now = new Date();
    await ContentRepo.findScheduledDue(now, asTx(stub));
    const arg = stub.content.findMany.mock.calls[0]?.[0] as {
      where: { status: { in: string[] }; scheduledFor: { lte: Date; not: null } };
      select: Record<string, boolean>;
    };
    expect(arg.where.status.in).toEqual(['DRAFT', 'IN_REVIEW']);
    expect(arg.where.scheduledFor).toEqual({ lte: now, not: null });
    expect(arg.select).toEqual({ id: true, scheduledFor: true });
  });

  it('publishScheduled is a no-op for an empty id list', async () => {
    const stub = makePrismaStub();
    await ContentRepo.publishScheduled([], asTx(stub));
    expect(stub.content.findMany).not.toHaveBeenCalled();
    expect(stub.content.update).not.toHaveBeenCalled();
  });

  it('publishScheduled flips each due item to PUBLISHED', async () => {
    const stub = makePrismaStub();
    const sched = new Date('2030-01-01T00:00:00Z');
    stub.content.findMany.mockResolvedValue([{ id: 'c1', scheduledFor: sched }]);
    await ContentRepo.publishScheduled(['c1'], asTx(stub));
    expect(stub.content.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'PUBLISHED', publishedAt: sched, scheduledFor: null },
    });
  });

  it('create forwards the input to content.create', async () => {
    const stub = makePrismaStub();
    await ContentRepo.create(
      { type: 'POST', slug: 'hi', title: 'Hi', body: 'B', authorId: 'u1' },
      asTx(stub),
    );
    const arg = stub.content.create.mock.calls[0]?.[0] as { data: { slug: string; status: string } };
    expect(arg.data.slug).toBe('hi');
    expect(arg.data.status).toBe('DRAFT');
  });

  it('update only includes provided fields', async () => {
    const stub = makePrismaStub();
    await ContentRepo.update('c1', { title: 'New' }, 'u1', asTx(stub));
    expect(stub.content.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { title: 'New' },
    });
  });

  it('update disconnects featuredMedia when set to null', async () => {
    const stub = makePrismaStub();
    await ContentRepo.update('c1', { featuredMediaId: null }, 'u1', asTx(stub));
    const arg = stub.content.update.mock.calls[0]?.[0] as {
      data: { featuredMedia: { disconnect: true } };
    };
    expect(arg.data.featuredMedia).toEqual({ disconnect: true });
  });

  it('transitionStatus sets publishedAt when entering PUBLISHED', async () => {
    const stub = makePrismaStub();
    await ContentRepo.transitionStatus('c1', 'PUBLISHED', 'u1', asTx(stub));
    const arg = stub.content.update.mock.calls[0]?.[0] as {
      data: { status: string; publishedAt: unknown; scheduledFor: null };
    };
    expect(arg.data.status).toBe('PUBLISHED');
    expect(arg.data.publishedAt).toBeInstanceOf(Date);
    expect(arg.data.scheduledFor).toBeNull();
  });

  it('transitionStatus does NOT touch publishedAt for non-PUBLISHED targets', async () => {
    const stub = makePrismaStub();
    await ContentRepo.transitionStatus('c1', 'ARCHIVED', 'u1', asTx(stub));
    const arg = stub.content.update.mock.calls[0]?.[0] as {
      data: { status: string; publishedAt?: unknown };
    };
    expect(arg.data.status).toBe('ARCHIVED');
    expect(arg.data.publishedAt).toBeUndefined();
  });

  it('softDelete sets deletedAt', async () => {
    const stub = makePrismaStub();
    await ContentRepo.softDelete('c1', asTx(stub));
    const arg = stub.content.update.mock.calls[0]?.[0] as {
      where: unknown;
      data: { deletedAt: unknown };
    };
    expect(arg.where).toEqual({ id: 'c1' });
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
  });
});
