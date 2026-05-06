import 'server-only';
import type { Prisma, RefreshToken } from '@prisma/client';
import { prisma as defaultClient } from '@/server/db/prisma';

type Db = Prisma.TransactionClient | typeof defaultClient;

function db(tx?: Prisma.TransactionClient): Db {
  return tx ?? defaultClient;
}

export const RefreshTokenRepo = {
  /**
   * Persist a new refresh token. `tokenHash` must already be SHA-256-hashed
   * by the auth service — we never store the raw token.
   */
  create(
    input: { userId: string; tokenHash: string; expiresAt: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<RefreshToken> {
    return db(tx).refreshToken.create({ data: input });
  },

  /** O(1) lookup for the refresh-rotation flow. */
  findByTokenHash(
    tokenHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RefreshToken | null> {
    return db(tx).refreshToken.findUnique({ where: { tokenHash } });
  },

  /** Mark a single token revoked. Used during rotation. */
  async revoke(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  /**
   * Revoke every active token for a user — used on logout-everywhere and
   * on refresh-token-reuse detection.
   */
  async revokeAllForUser(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** Background cleanup: delete tokens whose expiry is past. Returns the count. */
  async deleteExpired(now: Date, tx?: Prisma.TransactionClient): Promise<number> {
    const res = await db(tx).refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return res.count;
  },
};

export type RefreshTokenRepoType = typeof RefreshTokenRepo;
