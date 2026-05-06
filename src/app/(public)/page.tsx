import { Suspense } from 'react';
import { ContentRepo } from '@/server/db/repos/content.repo';
import { prisma } from '@/server/db/prisma';
import { CategoryNav } from '@/components/public/CategoryNav';
import { PostList } from '@/components/public/PostList';
import { PaginationBar } from '@/components/public/PaginationBar';

export const revalidate = 60;

const PAGE_SIZE = 12;

type SearchParams = Promise<{ page?: string }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp?.page ?? 1) || 1);

  const [items, total] = await Promise.all([
    ContentRepo.listPublicHomepage({ page: pageNum, pageSize: PAGE_SIZE }),
    prisma.content.count({
      where: {
        type: 'POST',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
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
      <Suspense fallback={null}>
        <CategoryNav />
      </Suspense>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Latest posts</h1>
      </header>
      <PostList items={listItems} />
      <PaginationBar
        page={pageNum}
        pageSize={PAGE_SIZE}
        total={total}
        basePath="/"
      />
    </div>
  );
}
