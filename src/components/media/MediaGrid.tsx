'use client';

import { Trash2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useMedia } from '@/lib/hooks/useMedia';
import { useDeleteMedia } from '@/lib/hooks/useDeleteMedia';
import { EmptyState } from '@/components/common/EmptyState';
import { formatBytes } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/errors';
import type { MediaItem } from '@/lib/types';

function isImage(mime: string): boolean {
  return mime.startsWith('image/');
}

export function MediaGrid({
  page = 1,
  pageSize = 24,
  selectable = false,
  onSelect,
  showActions = true,
}: {
  page?: number;
  pageSize?: number;
  selectable?: boolean;
  onSelect?: (m: MediaItem) => void;
  showActions?: boolean;
}) {
  const { data, isLoading } = useMedia({ page, pageSize });
  const del = useDeleteMedia();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  const items = data?.items ?? [];
  if (items.length === 0) {
    return <EmptyState title="No media yet" description="Upload your first file." />;
  }

  async function handleCopy(item: MediaItem) {
    const url = `/uploads/${item.storagePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error('Could not copy URL');
    }
  }

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((m) => {
        const url = `/uploads/${m.storagePath}`;
        return (
          <Card
            key={m.id}
            className={cn(
              'overflow-hidden',
              selectable && 'cursor-pointer hover:ring-2 hover:ring-primary',
            )}
            onClick={selectable ? () => onSelect?.(m) : undefined}
          >
            <CardContent className="aspect-square p-0">
              {isImage(m.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={m.altText ?? m.filename}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                  {m.mimeType}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-1 p-3">
              <p className="line-clamp-1 text-xs font-medium">{m.filename}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(m.sizeBytes)}</p>
              {showActions && !selectable ? (
                <div className="mt-1 flex w-full justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCopy(m);
                    }}
                  >
                    {copiedId === m.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(m.id);
                    }}
                    disabled={del.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
