import { describe, expect, it } from 'vitest';
import { RefreshTokenRepo } from '@/server/db/repos/refreshToken.repo';
import { asTx, makePrismaStub } from './_mockPrisma';

describe('RefreshTokenRepo', () => {
  it('create persists the supplied input', async () => {
    const stub = makePrismaStub();
    const input = { userId: 'u1', tokenHash: 'h', expiresAt: new Date() };
    await RefreshTokenRepo.create(input, asTx(stub));
    expect(stub.refreshToken.create).toHaveBeenCalledWith({ data: input });
  });

  it('findByTokenHash uses the unique tokenHash index', async () => {
    const stub = makePrismaStub();
    await RefreshTokenRepo.findByTokenHash('h', asTx(stub));
    expect(stub.refreshToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'h' } });
  });

  it('revoke marks the row revoked with a Date', async () => {
    const stub = makePrismaStub();
    await RefreshTokenRepo.revoke('rt1', asTx(stub));
    const call = stub.refreshToken.update.mock.calls[0]?.[0] as {
      where: unknown;
      data: { revokedAt: unknown };
    };
    expect(call.where).toEqual({ id: 'rt1' });
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });

  it('revokeAllForUser updates only non-revoked tokens', async () => {
    const stub = makePrismaStub();
    await RefreshTokenRepo.revokeAllForUser('u1', asTx(stub));
    const call = stub.refreshToken.updateMany.mock.calls[0]?.[0] as {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: unknown };
    };
    expect(call.where).toEqual({ userId: 'u1', revokedAt: null });
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });

  it('deleteExpired returns the deleted count', async () => {
    const stub = makePrismaStub();
    stub.refreshToken.deleteMany.mockResolvedValue({ count: 7 });
    const now = new Date();
    const n = await RefreshTokenRepo.deleteExpired(now, asTx(stub));
    expect(stub.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: now } },
    });
    expect(n).toBe(7);
  });
});
