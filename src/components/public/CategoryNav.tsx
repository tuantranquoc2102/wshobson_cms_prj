import Link from 'next/link';
import { prisma } from '@/server/db/prisma';

export async function CategoryNav() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    take: 12,
  });
  if (categories.length === 0) return null;
  return (
    <nav className="border-b">
      <div className="container flex flex-wrap items-center gap-3 py-2 text-sm">
        <span className="text-muted-foreground">Browse:</span>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="rounded-md px-2 py-1 hover:bg-muted"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
