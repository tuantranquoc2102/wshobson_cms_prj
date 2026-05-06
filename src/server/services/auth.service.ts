import 'server-only';
import type { User } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { UserRepo } from '@/server/db/repos/user.repo';
import { RefreshTokenRepo } from '@/server/db/repos/refreshToken.repo';
import { ApiError } from '@/server/http/apiError';
import { hashPassword, verifyPassword } from '@/server/lib/password';
import { signAccessToken } from '@/server/lib/jwt';
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from '@/server/lib/refreshToken';
import { checkRateLimit } from '@/server/lib/rateLimit';
import { ActivityService } from './activity.service';
import type { SessionUser } from '@/server/types/session';
import type { RegisterInput, LoginInput } from '@/server/schemas/auth.schema';

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string; // raw — handed to caller for cookie setting
  refreshExpiresAt: Date;
};

export type LoginResult = {
  user: SessionUser;
  tokens: IssuedTokens;
};

function publicUser(u: User): SessionUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

async function issueTokens(user: User): Promise<IssuedTokens> {
  const accessToken = await signAccessToken({ sub: user.id, role: user.role });
  const raw = generateRefreshToken();
  const tokenHash = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await RefreshTokenRepo.create({ userId: user.id, tokenHash, expiresAt });
  return { accessToken, refreshToken: raw, refreshExpiresAt: expiresAt };
}

export const AuthService = {
  async register(input: RegisterInput, ip: string): Promise<LoginResult> {
    const rl = checkRateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.ok) {
      throw new ApiError(
        'RATE_LIMITED',
        'Too many registration attempts, please retry later',
        429,
      );
    }
    const existing = await UserRepo.findByEmail(input.email);
    if (existing) {
      throw new ApiError('CONFLICT', 'Email already registered', 409);
    }
    const passwordHash = await hashPassword(input.password);
    const user = await UserRepo.create({
      email: input.email,
      name: input.name,
      role: 'AUTHOR',
      passwordHash,
    });
    const tokens = await issueTokens(user);
    await ActivityService.record({
      actorId: user.id,
      action: 'user.register',
      entityType: 'User',
      entityId: user.id,
    });
    return { user: publicUser(user), tokens };
  },

  async login(input: LoginInput, ip: string): Promise<LoginResult> {
    const rl = checkRateLimit(`login:${ip}`, 5, 60_000);
    if (!rl.ok) {
      throw new ApiError(
        'RATE_LIMITED',
        'Too many login attempts, please retry later',
        429,
      );
    }
    const user = await UserRepo.findByEmail(input.email);
    if (!user || user.deletedAt) {
      throw new ApiError('UNAUTHORIZED', 'Invalid credentials', 401);
    }
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new ApiError('UNAUTHORIZED', 'Invalid credentials', 401);
    }
    const tokens = await issueTokens(user);
    await ActivityService.record({
      actorId: user.id,
      action: 'user.login',
      entityType: 'User',
      entityId: user.id,
    });
    return { user: publicUser(user), tokens };
  },

  /**
   * Validate the supplied raw refresh token and rotate it. Implements
   * reuse detection: if the presented token has already been revoked, we
   * revoke the entire chain for that user and return 401.
   */
  async rotateRefresh(rawRefreshToken: string): Promise<LoginResult> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await RefreshTokenRepo.findByTokenHash(tokenHash);
    if (!existing) {
      throw new ApiError('UNAUTHORIZED', 'Invalid refresh token', 401);
    }
    if (existing.revokedAt) {
      // Reuse-detection: presented refresh token is already revoked → an
      // attacker may be replaying a stolen one. Revoke everything for safety.
      await RefreshTokenRepo.revokeAllForUser(existing.userId);
      throw new ApiError('UNAUTHORIZED', 'Refresh token reuse detected', 401);
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new ApiError('UNAUTHORIZED', 'Refresh token expired', 401);
    }

    const user = await UserRepo.findById(existing.userId);
    if (!user || user.deletedAt) {
      throw new ApiError('UNAUTHORIZED', 'Invalid session', 401);
    }

    return prisma.$transaction(async (tx) => {
      await RefreshTokenRepo.revoke(existing.id, tx);
      const accessToken = await signAccessToken({
        sub: user.id,
        role: user.role,
      });
      const raw = generateRefreshToken();
      const newHash = hashRefreshToken(raw);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
      await RefreshTokenRepo.create(
        { userId: user.id, tokenHash: newHash, expiresAt },
        tx,
      );
      return {
        user: publicUser(user),
        tokens: { accessToken, refreshToken: raw, refreshExpiresAt: expiresAt },
      };
    });
  },

  /** Revoke the supplied raw refresh token (logout). Idempotent. */
  async revoke(rawRefreshToken: string | null | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await RefreshTokenRepo.findByTokenHash(tokenHash);
    if (!existing || existing.revokedAt) return;
    await RefreshTokenRepo.revoke(existing.id);
    await ActivityService.record({
      actorId: existing.userId,
      action: 'user.logout',
      entityType: 'User',
      entityId: existing.userId,
    });
  },

  // Exposed helpers for tests / scripts
  issueTokens,
};
