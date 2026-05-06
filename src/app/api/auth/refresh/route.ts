import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { ApiError } from '@/server/http/apiError';
import {
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from '@/server/lib/cookies';
import { toResponse } from '@/server/http/respond';

export async function POST(): Promise<Response> {
  try {
    const store = await cookies();
    const raw = store.get(REFRESH_COOKIE_NAME)?.value;
    if (!raw) {
      throw new ApiError('UNAUTHORIZED', 'Missing refresh token', 401);
    }
    const result = await AuthService.rotateRefresh(raw);
    const res = NextResponse.json({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
    setRefreshCookie(res, result.tokens.refreshToken);
    return res;
  } catch (err) {
    return toResponse(err);
  }
}
