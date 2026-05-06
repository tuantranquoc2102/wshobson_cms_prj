import { NextResponse, type NextRequest } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { RegisterSchema } from '@/server/schemas/auth.schema';
import { validateBody } from '@/server/http/withValidation';
import { setRefreshCookie } from '@/server/lib/cookies';
import { clientIp } from '@/server/http/clientIp';
import { toResponse } from '@/server/http/respond';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await validateBody(RegisterSchema, req);
    const result = await AuthService.register(body, clientIp(req));
    const res = NextResponse.json(
      { user: result.user, accessToken: result.tokens.accessToken },
      { status: 201 },
    );
    setRefreshCookie(res, result.tokens.refreshToken);
    return res;
  } catch (err) {
    return toResponse(err);
  }
}
