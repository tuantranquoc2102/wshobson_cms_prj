import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function PostTags({
  tags,
}: {
  tags: { id: string; name: string; slug: string }[];
}) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-10 flex flex-wrap gap-2">
      {tags.map((t) => (
        <Link key={t.id} href={`/tag/${t.slug}`}>
          <Badge variant="outline">#{t.name}</Badge>
        </Link>
      ))}
    </div>
  );
}
