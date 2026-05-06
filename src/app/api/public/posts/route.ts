import { z } from 'zod';
import { type NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { ok, toResponse } from '@/server/http/respond';

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const obj: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => {
      obj[k] = v;
    });
    const q = QuerySchema.parse(obj);
    const items = await ContentRepo.listPublicHomepage({
      page: q.page,
      pageSize: q.pageSize,
    });
    const total = await prisma.content.count({
      where: {
        type: 'POST',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
      },
    });
    return ok({ items, total, page: q.page, pageSize: q.pageSize });
  } catch (err) {
    return toResponse(err);
  }
}
