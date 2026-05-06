import { z } from 'zod';
import { type NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { ContentRepo } from '@/server/db/repos/content.repo';
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
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) throw new ApiError('NOT_FOUND', 'Category not found', 404);
    const obj: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => {
      obj[k] = v;
    });
    const q = QuerySchema.parse(obj);
    const items = await ContentRepo.listPublicByCategory(slug, {
      page: q.page,
      pageSize: q.pageSize,
    });
    const total = await prisma.content.count({
      where: {
        type: 'POST',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
        categories: { some: { categoryId: cat.id } },
      },
    });
    return ok({ items, total, page: q.page, pageSize: q.pageSize });
  } catch (err) {
    return toResponse(err);
  }
}
