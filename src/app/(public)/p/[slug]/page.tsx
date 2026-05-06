import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { PostHeader } from '@/components/public/PostHeader';
import { PostBody } from '@/components/public/PostBody';

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await ContentRepo.getPublicBySlug(slug);
  if (!page || page.type !== 'PAGE') return { title: 'Not found' };
  return {
    title: page.title,
    description: page.excerpt ?? undefined,
  };
}

export default async function StaticPagePage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await ContentRepo.getPublicBySlug(slug);
  if (!page || page.type !== 'PAGE') notFound();
  return (
    <article className="mx-auto max-w-3xl">
      <PostHeader
        title={page.title}
        authorName={page.author.name}
        publishedAt={page.publishedAt}
      />
      <PostBody markdown={page.body} />
    </article>
  );
}
