import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db/prisma';
import { ContentRepo } from '@/server/db/repos/content.repo';
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
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) return { title: 'Category not found' };
  return {
    title: cat.name,
    description: cat.description ?? `Posts in category ${cat.name}`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp?.page ?? 1) || 1);

  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) notFound();

  const [items, total] = await Promise.all([
    ContentRepo.listPublicByCategory(slug, { page: pageNum, pageSize: PAGE_SIZE }),
    prisma.content.count({
      where: {
        type: 'POST',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
        categories: { some: { categoryId: cat.id } },
      },
    }),
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Category</p>
        <h1 className="text-3xl font-bold tracking-tight">{cat.name}</h1>
        {cat.description ? (
          <p className="text-muted-foreground">{cat.description}</p>
        ) : null}
      </header>
      <PostList items={listItems} />
      <PaginationBar
        page={pageNum}
        pageSize={PAGE_SIZE}
        total={total}
        basePath={`/category/${slug}`}
      />
    </div>
  );
}
