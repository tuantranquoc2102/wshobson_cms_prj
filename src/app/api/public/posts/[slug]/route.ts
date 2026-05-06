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
    const post = await ContentRepo.getPublicBySlug(slug);
    if (!post || post.type !== 'POST') {
      throw new ApiError('NOT_FOUND', 'Post not found', 404);
    }
    const html = await renderMarkdown(post.body);
    return ok({ post, html });
  } catch (err) {
    return toResponse(err);
  }
}
