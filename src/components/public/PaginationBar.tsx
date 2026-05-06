import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaginationBar({
  page,
  pageSize,
  total,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  const prev = page > 1 ? page - 1 : null;
  const next = page < pageCount ? page + 1 : null;
  const linkFor = (n: number) =>
    n === 1 ? basePath : `${basePath}?page=${n}`;
  return (
    <nav className="mt-10 flex items-center justify-between" aria-label="Pagination">
      <Button variant="outline" disabled={!prev} asChild={!!prev}>
        {prev ? (
          <Link href={linkFor(prev)}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        ) : (
          <span>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </span>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      <Button variant="outline" disabled={!next} asChild={!!next}>
        {next ? (
          <Link href={linkFor(next)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span>
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}
