'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Image as ImageIcon, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMedia } from '@/lib/hooks/useMedia';
import { Skeleton } from '@/components/ui/skeleton';
import type { MediaItem } from '@/lib/types';

// Heavy modal — only mount when the picker is opened.
const MediaGrid = dynamic(
  () => import('./MediaGrid').then((m) => ({ default: m.MediaGrid })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);
const UploadDropzone = dynamic(
  () => import('./UploadDropzone').then((m) => ({ default: m.UploadDropzone })),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> },
);

export function MediaPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (mediaId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useMedia({ pageSize: 100 });
  const selected = (data?.items ?? []).find((m) => m.id === value) ?? null;

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-start gap-3 rounded-md border p-3">
          {selected.mimeType.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/uploads/${selected.storagePath}`}
              alt={selected.altText ?? selected.filename}
              className="h-16 w-16 rounded object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-xs">
              {selected.mimeType}
            </div>
          )}
          <div className="flex-1">
            <p className="line-clamp-1 text-sm font-medium">{selected.filename}</p>
            <p className="text-xs text-muted-foreground">{selected.altText}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            aria-label="Remove featured media"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <ImageIcon className="h-4 w-4" />
            {selected ? 'Change' : 'Pick'} featured media
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select media</DialogTitle>
            <DialogDescription>
              Choose an existing file or upload a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <UploadDropzone
              onUploaded={(id) => {
                onChange(id);
                setOpen(false);
              }}
            />
            <div className="max-h-[420px] overflow-auto">
              <MediaGrid
                pageSize={48}
                selectable
                showActions={false}
                onSelect={(m: MediaItem) => {
                  onChange(m.id);
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
