import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db/prisma';
import { PostList } from '@/components/public/PostList';
import { PaginationBar } from '@/components/public/PaginationBar';

export const revalidate = 60;

const PAGE_SIZE = 12;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return { title: 'Tag not found' };
  return { title: `#${tag.name}`, description: `Posts tagged ${tag.name}` };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp?.page ?? 1) || 1);

  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) notFound();

  const where = {
    type: 'POST' as const,
    status: 'PUBLISHED' as const,
    publishedAt: { lte: new Date() },
    deletedAt: null,
    tags: { some: { tagId: tag.id } },
  };
  const skip = Math.max(0, (pageNum - 1) * PAGE_SIZE);
  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        author: { select: { id: true, name: true } },
        categories: { include: { category: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  const listItems = items.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    publishedAt: p.publishedAt,
    author: { id: p.author.id, name: p.author.name },
    categories: p.categories.map((cc) => ({
      category: {
        id: cc.category.id,
        name: cc.category.name,
        slug: cc.category.slug,
      },
    })),
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Tag</p>
        <h1 className="text-3xl font-bold tracking-tight">#{tag.name}</h1>
      </header>
      <PostList items={listItems} />
      <PaginationBar
        page={pageNum}
        pageSize={PAGE_SIZE}
        total={total}
        basePath={`/tag/${slug}`}
      />
    </div>
  );
}
