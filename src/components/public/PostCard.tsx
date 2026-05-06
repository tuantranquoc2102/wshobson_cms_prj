import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';

export type PostCardProps = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | Date | null;
  authorName: string | null;
  categories?: { id: string; name: string; slug: string }[];
};

export function PostCard({
  slug,
  title,
  excerpt,
  publishedAt,
  authorName,
  categories = [],
}: PostCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <Link href={`/blog/${slug}`} className="block">
        <CardHeader>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.name}
                </Badge>
              ))}
            </div>
          ) : null}
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-xs">
            {authorName ?? 'Unknown'}
            {publishedAt ? ` · ${formatDate(publishedAt, 'long')}` : null}
          </CardDescription>
        </CardHeader>
        {excerpt ? (
          <CardContent>
            <p className="line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
          </CardContent>
        ) : null}
      </Link>
    </Card>
  );
}
