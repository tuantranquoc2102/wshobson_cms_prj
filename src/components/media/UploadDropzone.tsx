'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useUploadMedia } from '@/lib/hooks/useUploadMedia';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function UploadDropzone({
  onUploaded,
  className,
}: {
  onUploaded?: (mediaId: string, storagePath: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadMedia();

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const file of arr) {
      try {
        const m = await upload.mutateAsync({ file });
        toast.success(`Uploaded ${m.filename}`);
        onUploaded?.(m.id, m.storagePath);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Upload failed');
      }
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) void handleFiles(e.target.files);
    e.target.value = '';
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        dragOver ? 'border-primary bg-accent/40' : 'border-border',
        className,
      )}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Drop files to upload</p>
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF, SVG, PDF (max 10 MB)</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onChange}
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? <Spinner /> : null}
        Choose files
      </Button>
    </div>
  );
}
