import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
} from '@/server/lib/cookies';
import { toResponse } from '@/server/http/respond';

export async function POST(): Promise<Response> {
  try {
    const store = await cookies();
    const raw = store.get(REFRESH_COOKIE_NAME)?.value ?? null;
    await AuthService.revoke(raw);
    const res = NextResponse.json({ ok: true });
    clearRefreshCookie(res);
    return res;
  } catch (err) {
    return toResponse(err);
  }
}
