import { describe, expect, it } from 'vitest';
import { ActivityLogRepo } from '@/server/db/repos/activityLog.repo';
import { asTx, makePrismaStub } from './_mockPrisma';

describe('ActivityLogRepo', () => {
  it('record persists the audit row with metadata', async () => {
    const stub = makePrismaStub();
    await ActivityLogRepo.record(
      {
        actorId: 'u1',
        action: 'content.publish',
        entityType: 'Content',
        entityId: 'c1',
        metadata: { from: 'DRAFT', to: 'PUBLISHED' },
      },
      asTx(stub),
    );
    expect(stub.activityLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'u1',
        action: 'content.publish',
        entityType: 'Content',
        entityId: 'c1',
        metadata: { from: 'DRAFT', to: 'PUBLISHED' },
      },
    });
  });

  it('record stores null when no metadata is provided', async () => {
    const stub = makePrismaStub();
    await ActivityLogRepo.record(
      { actorId: 'u1', action: 'user.login', entityType: 'User', entityId: 'u1' },
      asTx(stub),
    );
    const arg = stub.activityLog.create.mock.calls[0]?.[0] as { data: { metadata: null } };
    expect(arg.data.metadata).toBeNull();
  });

  it('listRecent orders by createdAt desc with a limit', async () => {
    const stub = makePrismaStub();
    await ActivityLogRepo.listRecent(25, asTx(stub));
    expect(stub.activityLog.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  });

  it('listForEntity scopes by (entityType, entityId)', async () => {
    const stub = makePrismaStub();
    await ActivityLogRepo.listForEntity('Content', 'c1', asTx(stub));
    expect(stub.activityLog.findMany).toHaveBeenCalledWith({
      where: { entityType: 'Content', entityId: 'c1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
