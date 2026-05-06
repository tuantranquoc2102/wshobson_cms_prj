import { z } from 'zod';
import { type NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { ApiError } from '@/server/http/apiError';
import { ok, toResponse } from '@/server/http/respond';

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

type Params = { slug: string };

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  try {
    const { slug } = await ctx.params;
    const tag = await prisma.tag.findUnique({ where: { slug } });
    if (!tag) throw new ApiError('NOT_FOUND', 'Tag not found', 404);
    const obj: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => {
      obj[k] = v;
    });
    const q = QuerySchema.parse(obj);
    const skip = Math.max(0, (q.page - 1) * q.pageSize);
    const where = {
      type: 'POST' as const,
      status: 'PUBLISHED' as const,
      publishedAt: { lte: new Date() },
      deletedAt: null,
      tags: { some: { tagId: tag.id } },
    };
    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: q.pageSize,
        include: {
          author: { select: { id: true, name: true } },
          featuredMedia: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.content.count({ where }),
    ]);
    return ok({ items, total, page: q.page, pageSize: q.pageSize });
  } catch (err) {
    return toResponse(err);
  }
}
