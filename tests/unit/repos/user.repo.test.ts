import { describe, expect, it } from 'vitest';
import { UserRepo } from '@/server/db/repos/user.repo';
import { asTx, makePrismaStub } from './_mockPrisma';

describe('UserRepo', () => {
  it('findByEmail issues a unique lookup', async () => {
    const stub = makePrismaStub();
    stub.user.findUnique.mockResolvedValue({ id: 'u1' });
    const out = await UserRepo.findByEmail('me@example.com', asTx(stub));
    expect(stub.user.findUnique).toHaveBeenCalledWith({ where: { email: 'me@example.com' } });
    expect(out).toEqual({ id: 'u1' });
  });

  it('findById issues a unique lookup', async () => {
    const stub = makePrismaStub();
    await UserRepo.findById('u1', asTx(stub));
    expect(stub.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('create passes the input straight to user.create', async () => {
    const stub = makePrismaStub();
    const input = { email: 'a@b', passwordHash: 'h', name: 'A', role: 'AUTHOR' as const };
    await UserRepo.create(input, asTx(stub));
    expect(stub.user.create).toHaveBeenCalledWith({ data: input });
  });

  it('updateRole updates only the role column', async () => {
    const stub = makePrismaStub();
    await UserRepo.updateRole('u1', 'EDITOR', asTx(stub));
    expect(stub.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { role: 'EDITOR' } });
  });

  it('softDelete sets deletedAt to a Date', async () => {
    const stub = makePrismaStub();
    await UserRepo.softDelete('u1', asTx(stub));
    const call = stub.user.update.mock.calls[0]?.[0] as { where: unknown; data: { deletedAt: unknown } };
    expect(call.where).toEqual({ id: 'u1' });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it('listActive returns items + total and filters out deleted users', async () => {
    const stub = makePrismaStub();
    stub.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    stub.user.count.mockResolvedValue(1);
    const out = await UserRepo.listActive({ page: 1, pageSize: 20 }, asTx(stub));
    expect(stub.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null }, skip: 0, take: 20 }),
    );
    expect(stub.user.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(out).toEqual({ items: [{ id: 'u1' }], total: 1 });
  });
});
