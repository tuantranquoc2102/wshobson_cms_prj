'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const LABELS: Record<string, string> = {
  admin: 'Admin',
  content: 'Content',
  media: 'Media',
  categories: 'Categories',
  tags: 'Tags',
  users: 'Users',
  'review-queue': 'Review queue',
  new: 'New',
  edit: 'Edit',
  revisions: 'Revisions',
};

function labelFor(seg: string): string {
  return LABELS[seg] ?? seg;
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return null;
  let acc = '';
  return (
    <nav
      className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
      aria-label="Breadcrumb"
    >
      {parts.map((seg, i) => {
        acc += `/${seg}`;
        const isLast = i === parts.length - 1;
        return (
          <Fragment key={acc}>
            {i > 0 ? <ChevronRight className="h-3 w-3" /> : null}
            {isLast ? (
              <span className="text-foreground">{labelFor(seg)}</span>
            ) : (
              <Link href={acc} className="hover:text-foreground">
                {labelFor(seg)}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
