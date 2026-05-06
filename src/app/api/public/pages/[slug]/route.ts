import { ContentRepo } from '@/server/db/repos/content.repo';
import { ApiError } from '@/server/http/apiError';
import { ok, toResponse } from '@/server/http/respond';
import { renderMarkdown } from '@/server/lib/markdown';

type Params = { slug: string };

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  try {
    const { slug } = await ctx.params;
    const page = await ContentRepo.getPublicBySlug(slug);
    if (!page || page.type !== 'PAGE') {
      throw new ApiError('NOT_FOUND', 'Page not found', 404);
    }
    const html = await renderMarkdown(page.body);
    return ok({ page, html });
  } catch (err) {
    return toResponse(err);
  }
}
