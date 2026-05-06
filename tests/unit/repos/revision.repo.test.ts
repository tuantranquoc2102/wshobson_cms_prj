import { describe, expect, it } from 'vitest';
import { RevisionRepo } from '@/server/db/repos/revision.repo';
import { asTx, makePrismaStub } from './_mockPrisma';

describe('RevisionRepo', () => {
  it('list orders newest first', async () => {
    const stub = makePrismaStub();
    await RevisionRepo.list('c1', asTx(stub));
    expect(stub.revision.findMany).toHaveBeenCalledWith({
      where: { contentId: 'c1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('get uses the composite (contentId, version) unique key', async () => {
    const stub = makePrismaStub();
    await RevisionRepo.get('c1', 3, asTx(stub));
    expect(stub.revision.findUnique).toHaveBeenCalledWith({
      where: { contentId_version: { contentId: 'c1', version: 3 } },
    });
  });

  it('nextVersion returns 1 when there are no prior revisions', async () => {
    const stub = makePrismaStub();
    stub.revision.findFirst.mockResolvedValue(null);
    const v = await RevisionRepo.nextVersion('c1', asTx(stub));
    expect(v).toBe(1);
  });

  it('nextVersion increments the latest version', async () => {
    const stub = makePrismaStub();
    stub.revision.findFirst.mockResolvedValue({ version: 4 });
    const v = await RevisionRepo.nextVersion('c1', asTx(stub));
    expect(v).toBe(5);
  });

  it('appendFromContent snapshots current Content into a new Revision', async () => {
    const stub = makePrismaStub();
    stub.content.findUniqueOrThrow.mockResolvedValue({ title: 'T', body: 'B', excerpt: 'E' });
    stub.revision.findFirst.mockResolvedValue({ version: 2 });
    await RevisionRepo.appendFromContent('c1', 'u1', asTx(stub));
    expect(stub.revision.create).toHaveBeenCalledWith({
      data: {
        contentId: 'c1',
        version: 3,
        title: 'T',
        body: 'B',
        excerpt: 'E',
        authorId: 'u1',
      },
    });
  });
});
