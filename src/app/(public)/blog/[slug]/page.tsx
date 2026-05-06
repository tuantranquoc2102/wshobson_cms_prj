import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { PostHeader } from '@/components/public/PostHeader';
import { PostBody } from '@/components/public/PostBody';
import { PostTags } from '@/components/public/PostTags';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await ContentRepo.getPublicBySlug(slug);
  if (!post || post.type !== 'POST') return { title: 'Not found' };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: 'article',
      publishedTime: post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: post.featuredMedia
        ? [{ url: `/uploads/${post.featuredMedia.storagePath}` }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await ContentRepo.getPublicBySlug(slug);
  if (!post || post.type !== 'POST') notFound();

  const categories = post.categories.map((cc) => cc.category);
  const tags = post.tags.map((tt) => tt.tag);

  return (
    <article className="mx-auto max-w-3xl">
      <PostHeader
        title={post.title}
        authorName={post.author.name}
        publishedAt={post.publishedAt}
      />
      {categories.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}>
              <Badge variant="secondary">{c.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}
      <PostBody markdown={post.body} />
      <PostTags tags={tags} />
    </article>
  );
}
