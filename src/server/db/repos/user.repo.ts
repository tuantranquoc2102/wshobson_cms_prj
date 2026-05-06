import 'server-only';
import type { Prisma, Role, User } from '@prisma/client';
import { prisma as defaultClient } from '@/server/db/prisma';
import type { Pagination } from '@/server/types/pagination';
import { toSkip } from '@/server/types/pagination';

/**
 * A Prisma client or transaction client — both expose the same model
 * delegates we need, so repos accept whichever the caller has.
 */
type Db = Prisma.TransactionClient | typeof defaultClient;

function db(tx?: Prisma.TransactionClient): Db {
  return tx ?? defaultClient;
}

export const UserRepo = {
  /** Login lookup (point read on the unique email index). */
  findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return db(tx).user.findUnique({ where: { email } });
  },

  /** Hydrate session from the JWT `sub` claim. */
  findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return db(tx).user.findUnique({ where: { id } });
  },

  /** Insert a new user. Caller is responsible for hashing the password. */
  create(
    input: { email: string; passwordHash: string; name: string; role: Role },
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return db(tx).user.create({ data: input });
  },

  /** Promote/demote a user. ADMIN-only operation at the service layer. */
  updateRole(id: string, role: Role, tx?: Prisma.TransactionClient): Promise<User> {
    return db(tx).user.update({ where: { id }, data: { role } });
  },

  /**
   * Soft-delete: set `deletedAt = now`. Hard delete is a separate explicit
   * operation (out of scope for MVP) so authored content keeps its FK.
   */
  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await db(tx).user.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  /** Paginated list of non-deleted users for the admin user-management page. */
  async listActive(
    p: Pagination,
    tx?: Prisma.TransactionClient,
  ): Promise<{ items: User[]; total: number }> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    const [items, total] = await Promise.all([
      db(tx).user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(p),
        take: p.pageSize,
      }),
      db(tx).user.count({ where }),
    ]);
    return { items, total };
  },
};

export type UserRepoType = typeof UserRepo;
