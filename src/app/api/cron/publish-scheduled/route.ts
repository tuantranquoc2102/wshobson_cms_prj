import { type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { ApiError } from '@/server/http/apiError';
import { ok, toResponse } from '@/server/http/respond';
import { PublishingService } from '@/server/services/publishing.service';

function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      throw new ApiError('UNAUTHORIZED', 'Cron is not configured', 401);
    }
    const provided = req.headers.get('x-cron-secret') ?? '';
    if (!safeCompare(provided, expected)) {
      throw new ApiError('UNAUTHORIZED', 'Invalid cron secret', 401);
    }
    const result = await PublishingService.runScheduledPublish();
    return ok(result);
  } catch (err) {
    return toResponse(err);
  }
}
