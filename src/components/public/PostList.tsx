import { PostCard } from './PostCard';
import { EmptyState } from '@/components/common/EmptyState';

export type PostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | Date | null;
  author: { id: string; name: string | null };
  categories: { category: { id: string; name: string; slug: string } }[];
};

export function PostList({ items }: { items: PostListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        description="Check back soon for new content."
      />
    );
  }
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <PostCard
          key={p.id}
          slug={p.slug}
          title={p.title}
          excerpt={p.excerpt}
          publishedAt={p.publishedAt}
          authorName={p.author?.name ?? null}
          categories={p.categories.map((c) => c.category)}
        />
      ))}
    </div>
  );
}
