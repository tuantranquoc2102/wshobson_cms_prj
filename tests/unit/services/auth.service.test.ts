import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all repo and lib dependencies before importing the service.
vi.mock('@/server/db/repos/user.repo', () => ({
  UserRepo: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('@/server/db/repos/refreshToken.repo', () => ({
  RefreshTokenRepo: {
    create: vi.fn().mockResolvedValue(undefined),
    findByTokenHash: vi.fn(),
    revoke: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/server/lib/password', () => ({
  hashPassword: vi.fn(async (s: string) => `hash:${s}`),
  verifyPassword: vi.fn(),
}));
vi.mock('@/server/lib/jwt', () => ({
  signAccessToken: vi.fn(async () => 'access-token'),
}));
vi.mock('@/server/lib/refreshToken', () => ({
  generateRefreshToken: vi.fn(() => 'raw-refresh'),
  hashRefreshToken: vi.fn((s: string) => `sha:${s}`),
  REFRESH_TOKEN_TTL_MS: 1000 * 60 * 60 * 24 * 30,
}));
// Bypass real prisma — only $transaction is touched.
vi.mock('@/server/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));
vi.mock('@/server/services/activity.service', () => ({
  ActivityService: { record: vi.fn().mockResolvedValue(undefined) },
}));

import { AuthService } from '@/server/services/auth.service';
import { UserRepo } from '@/server/db/repos/user.repo';
import { RefreshTokenRepo } from '@/server/db/repos/refreshToken.repo';
import { verifyPassword } from '@/server/lib/password';
import { _resetRateLimit } from '@/server/lib/rateLimit';
import { ApiError } from '@/server/http/apiError';

const fakeUser = {
  id: 'u1',
  email: 'a@b.test',
  name: 'A',
  role: 'AUTHOR' as const,
  passwordHash: 'pw-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

beforeEach(() => {
  _resetRateLimit();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthService.login', () => {
  it('returns user + tokens on happy path', async () => {
    vi.mocked(UserRepo.findByEmail).mockResolvedValue(fakeUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const result = await AuthService.login(
      { email: 'a@b.test', password: 'pw' },
      '127.0.0.1',
    );

    expect(result.user.id).toBe('u1');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.tokens.refreshToken).toBe('raw-refresh');
    expect(RefreshTokenRepo.create).toHaveBeenCalledOnce();
  });

  it('rejects wrong password as 401', async () => {
    vi.mocked(UserRepo.findByEmail).mockResolvedValue(fakeUser);
    vi.mocked(verifyPassword).mockResolvedValue(false);
    await expect(
      AuthService.login({ email: 'a@b.test', password: 'wrong' }, '127.0.0.1'),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  it('rejects unknown email as 401 (no user enumeration)', async () => {
    vi.mocked(UserRepo.findByEmail).mockResolvedValue(null);
    await expect(
      AuthService.login({ email: 'nobody@b.test', password: 'pw' }, '127.0.0.1'),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  it('rate-limits after 5 attempts on the same IP', async () => {
    vi.mocked(UserRepo.findByEmail).mockResolvedValue(fakeUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    for (let i = 0; i < 5; i++) {
      await AuthService.login({ email: 'a@b.test', password: 'pw' }, '9.9.9.9');
    }
    await expect(
      AuthService.login({ email: 'a@b.test', password: 'pw' }, '9.9.9.9'),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });
});

describe('AuthService.rotateRefresh', () => {
  it('rotates a valid refresh token', async () => {
    vi.mocked(RefreshTokenRepo.findByTokenHash).mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'sha:raw-refresh',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
      createdAt: new Date(),
    });
    vi.mocked(UserRepo.findById).mockResolvedValue(fakeUser);

    const result = await AuthService.rotateRefresh('raw-refresh');
    expect(RefreshTokenRepo.revoke).toHaveBeenCalledWith('rt1', expect.anything());
    expect(RefreshTokenRepo.create).toHaveBeenCalled();
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('reuse detection: presented revoked token revokes whole chain', async () => {
    vi.mocked(RefreshTokenRepo.findByTokenHash).mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'sha:raw-refresh',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100_000),
      createdAt: new Date(),
    });

    await expect(AuthService.rotateRefresh('raw-refresh')).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(RefreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('rejects unknown refresh token as 401', async () => {
    vi.mocked(RefreshTokenRepo.findByTokenHash).mockResolvedValue(null);
    await expect(AuthService.rotateRefresh('whatever')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('rejects expired refresh token as 401', async () => {
    vi.mocked(RefreshTokenRepo.findByTokenHash).mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'sha:raw-refresh',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
      createdAt: new Date(),
    });
    await expect(AuthService.rotateRefresh('raw-refresh')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});

describe('AuthService.register', () => {
  it('creates a new AUTHOR user and issues tokens (happy path)', async () => {
    vi.mocked(UserRepo.findByEmail).mockResolvedValue(null);
    vi.mocked(UserRepo.create).mockResolvedValue({
      ...fakeUser,
      email: 'newbie@example.com',
      id: 'u-new',
    });

    const out = await AuthService.register(
      { email: 'newbie@example.com', name: 'Newbie', password: 'pass1234' },
      '127.0.0.1',
    );
    expect(UserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newbie@example.com',
        role: 'AUTHOR',
        passwordHash: 'hash:pass1234',
      }),
    );
    expect(out.user.id).toBe('u-new');
    expect(out.tokens.accessToken).toBe('access-token');
    expect(RefreshTokenRepo.create).toHaveBeenCalledOnce();
  });

  it('rejects a duplicate email with 409 CONFLICT', async () => {
    vi.mocked(UserRepo.findByEmail).mockResolvedValue(fakeUser);
    await expect(
      AuthService.register(
        { email: fakeUser.email, name: 'A', password: 'pass1234' },
        '127.0.0.1',
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(UserRepo.create).not.toHaveBeenCalled();
  });

  it('rate-limits register after 5 attempts from the same IP', async () => {
    vi.mocked(UserRepo.findByEmail).mockResolvedValue(null);
    vi.mocked(UserRepo.create).mockResolvedValue(fakeUser);
    for (let i = 0; i < 5; i++) {
      await AuthService.register(
        { email: `u${i}@x.test`, name: 'N', password: 'pass1234' },
        '8.8.8.8',
      );
    }
    await expect(
      AuthService.register(
        { email: 'u6@x.test', name: 'N', password: 'pass1234' },
        '8.8.8.8',
      ),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });
});

describe('AuthService.register password validation (schema-level)', () => {
  // The service trusts that callers have already validated input via
  // RegisterSchema. We verify the schema rejects weak passwords so the
  // contract holds end-to-end without a real DB.
  it('rejects passwords shorter than 8 chars', async () => {
    const { RegisterSchema } = await import('@/server/schemas/auth.schema');
    const r = RegisterSchema.safeParse({
      email: 'a@b.test',
      name: 'A',
      password: 'short1',
    });
    expect(r.success).toBe(false);
  });

  it('rejects passwords missing a digit', async () => {
    const { RegisterSchema } = await import('@/server/schemas/auth.schema');
    const r = RegisterSchema.safeParse({
      email: 'a@b.test',
      name: 'A',
      password: 'onlyletters',
    });
    expect(r.success).toBe(false);
  });

  it('rejects passwords missing a letter', async () => {
    const { RegisterSchema } = await import('@/server/schemas/auth.schema');
    const r = RegisterSchema.safeParse({
      email: 'a@b.test',
      name: 'A',
      password: '12345678',
    });
    expect(r.success).toBe(false);
  });
});

describe('AuthService.revoke', () => {
  it('revokes the supplied raw refresh token (happy path)', async () => {
    vi.mocked(RefreshTokenRepo.findByTokenHash).mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'sha:raw',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
      createdAt: new Date(),
    });
    await AuthService.revoke('raw');
    expect(RefreshTokenRepo.revoke).toHaveBeenCalledWith('rt1');
  });

  it('is a no-op for an unknown refresh token', async () => {
    vi.mocked(RefreshTokenRepo.findByTokenHash).mockResolvedValue(null);
    await AuthService.revoke('mystery');
    expect(RefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });

  it('is a no-op when nothing is supplied (idempotent logout)', async () => {
    await AuthService.revoke(null);
    await AuthService.revoke(undefined);
    expect(RefreshTokenRepo.findByTokenHash).not.toHaveBeenCalled();
  });

  it('is a no-op when the token is already revoked', async () => {
    vi.mocked(RefreshTokenRepo.findByTokenHash).mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'sha:raw',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100_000),
      createdAt: new Date(),
    });
    await AuthService.revoke('raw');
    expect(RefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });
});
