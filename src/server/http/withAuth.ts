import 'server-only';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/server/lib/jwt';
import { UserRepo } from '@/server/db/repos/user.repo';
import { ApiError } from './apiError';
import { toResponse } from './respond';
import type { Role } from '@prisma/client';
import type { SessionUser } from '@/server/types/session';

type Ctx<P> = { params: Promise<P>; session: SessionUser };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;

/**
 * Wrap a route handler with bearer-token authentication and optional
 * role gating. Sets `ctx.session` for the wrapped handler.
 */
export function withAuth<P = Record<string, string>>(
  handler: Handler<P>,
  opts: { roles?: Role[] } = {},
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const header = req.headers.get('authorization') ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        throw new ApiError('UNAUTHORIZED', 'Missing access token', 401);
      }

      let payload;
      try {
        payload = await verifyAccessToken(token);
      } catch {
        throw new ApiError('UNAUTHORIZED', 'Invalid access token', 401);
      }

      const user = await UserRepo.findById(payload.sub);
      if (!user || user.deletedAt) {
        throw new ApiError('UNAUTHORIZED', 'Invalid session', 401);
      }
      if (opts.roles && !opts.roles.includes(user.role)) {
        throw new ApiError('FORBIDDEN', 'Insufficient role', 403);
      }

      const session: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
      return await handler(req, { params: ctx.params, session });
    } catch (err) {
      return toResponse(err);
    }
  };
}
