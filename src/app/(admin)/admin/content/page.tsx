'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ContentTable } from '@/components/content/ContentTable';
import { useContentList } from '@/lib/hooks/useContentList';
import { useDebounced } from '@/lib/hooks/useDebounced';
import type {
  ContentFilters,
  ContentStatus,
  ContentType,
} from '@/lib/types';

const STATUS_VALUES: ContentStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'ARCHIVED',
];
const TYPE_VALUES: ContentType[] = ['POST', 'PAGE'];

export default function ContentListPage() {
  const router = useRouter();
  const search = useSearchParams();

  const status = search.get('status') as ContentStatus | null;
  const type = search.get('type') as ContentType | null;
  const initialQ = search.get('q') ?? '';
  const page = Math.max(1, Number(search.get('page') ?? 1) || 1);

  const [q, setQ] = useState(initialQ);
  const debouncedQ = useDebounced(q, 300);

  // Push debounced search query into URL.
  useEffect(() => {
    const params = new URLSearchParams(search.toString());
    if (debouncedQ) params.set('q', debouncedQ);
    else params.delete('q');
    if (params.toString() !== search.toString()) {
      router.replace(`/admin/content?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const filters: ContentFilters = {
    page,
    pageSize: 25,
    status: status ?? undefined,
    type: type ?? undefined,
    q: debouncedQ || undefined,
  };
  const { data, isLoading } = useContentList(filters);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(search.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page'); // reset paging on filter change
    router.replace(`/admin/content?${params.toString()}`);
  }

  function setPage(n: number) {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(n));
    router.replace(`/admin/content?${params.toString()}`);
  }

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize!));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground">
            All posts and pages.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content/new">
            <Plus className="h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Input
            placeholder="Search title or excerpt…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => setParam('status', v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={type ?? 'all'}
            onValueChange={(v) => setParam('type', v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPE_VALUES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <ContentTable rows={data?.items ?? []} loading={isLoading} />

      {pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount} · {total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
