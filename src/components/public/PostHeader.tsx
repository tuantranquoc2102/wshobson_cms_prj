import { formatDate } from '@/lib/formatters';

export function PostHeader({
  title,
  authorName,
  publishedAt,
}: {
  title: string;
  authorName: string | null;
  publishedAt: string | Date | null;
}) {
  return (
    <header className="mb-8 space-y-2">
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {authorName ?? 'Unknown'}
        {publishedAt ? ` · ${formatDate(publishedAt, 'long')}` : null}
      </p>
    </header>
  );
}
