'use client';

import Link from 'next/link';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from './StatusBadge';
import type { ContentSummary } from '@/lib/types';
import { formatRelative } from '@/lib/formatters';
import { useDeleteContent } from '@/lib/hooks/useDeleteContent';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/errors';

export function ContentTable({
  rows,
  loading,
}: {
  rows: ContentSummary[];
  loading?: boolean;
}) {
  const del = useDeleteContent();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const columns: Column<ContentSummary>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (r) => (
        <div className="min-w-0">
          <Link
            href={`/admin/content/${r.id}/edit`}
            className="line-clamp-1 font-medium hover:underline"
          >
            {r.title}
          </Link>
          <p className="text-xs text-muted-foreground">/{r.slug}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => <span className="text-xs uppercase">{r.type}</span>,
      className: 'w-20',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.status} />,
      className: 'w-32',
    },
    {
      key: 'author',
      header: 'Author',
      cell: (r) => <span className="text-sm">{r.author?.name ?? '—'}</span>,
      className: 'w-40',
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatRelative(r.updatedAt)}
        </span>
      ),
      className: 'w-32',
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/content/${r.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/content/${r.id}/revisions`}>
                Revisions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmId(r.id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyTitle="No content"
        emptyDescription="Create your first post to get started."
      />
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) => {
          if (!v) setConfirmId(null);
        }}
        title="Delete content?"
        description="This soft-deletes the item; revisions and history are kept."
        destructive
        confirmLabel="Delete"
        loading={del.isPending}
        onConfirm={async () => {
          if (!confirmId) return;
          try {
            await del.mutateAsync(confirmId);
            toast.success('Deleted');
            setConfirmId(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Delete failed');
          }
        }}
      />
    </>
  );
}
