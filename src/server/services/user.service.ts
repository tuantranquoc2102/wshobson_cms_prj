import 'server-only';
import type { User } from '@prisma/client';
import { UserRepo } from '@/server/db/repos/user.repo';
import { ApiError } from '@/server/http/apiError';
import { hashPassword } from '@/server/lib/password';
import { ActivityService } from './activity.service';
import type { CreateUserInput, UpdateUserInput } from '@/server/schemas/user.schema';
import type { Page, Pagination } from '@/server/types/pagination';
import type { SessionUser } from '@/server/types/session';

export type PublicUser = Omit<User, 'passwordHash'>;

function strip(user: User): PublicUser {
  // Never leak the password hash.
  const { passwordHash: _ignore, ...rest } = user;
  void _ignore;
  return rest;
}

export const UserService = {
  async list(p: Pagination): Promise<Page<PublicUser>> {
    const { items, total } = await UserRepo.listActive(p);
    return {
      items: items.map(strip),
      page: p.page,
      pageSize: p.pageSize,
      total,
    };
  },

  async create(input: CreateUserInput, actor: SessionUser): Promise<PublicUser> {
    const existing = await UserRepo.findByEmail(input.email);
    if (existing) {
      throw new ApiError('CONFLICT', 'Email already registered', 409);
    }
    const passwordHash = await hashPassword(input.password);
    const user = await UserRepo.create({
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
    });
    await ActivityService.record({
      actorId: actor.id,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: input.role },
    });
    return strip(user);
  },

  async update(
    id: string,
    input: UpdateUserInput,
    actor: SessionUser,
  ): Promise<PublicUser> {
    const target = await UserRepo.findById(id);
    if (!target) throw new ApiError('NOT_FOUND', 'User not found', 404);

    let updated = target;
    if (input.role !== undefined && input.role !== target.role) {
      updated = await UserRepo.updateRole(id, input.role);
      await ActivityService.record({
        actorId: actor.id,
        action: 'user.updateRole',
        entityType: 'User',
        entityId: id,
        metadata: { from: target.role, to: input.role },
      });
    }
    if (input.softDeleted === true && !target.deletedAt) {
      await UserRepo.softDelete(id);
      const refreshed = await UserRepo.findById(id);
      if (refreshed) updated = refreshed;
      await ActivityService.record({
        actorId: actor.id,
        action: 'user.softDelete',
        entityType: 'User',
        entityId: id,
      });
    }
    return strip(updated);
  },
};
