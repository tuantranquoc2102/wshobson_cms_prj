'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import '@uiw/react-md-editor/markdown-editor.css';

// `@uiw/react-md-editor` ships heavy code-mirror chunks — load on the
// client only.
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full" />,
});

export function MarkdownEditor({
  value,
  onChange,
  height = 420,
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number;
}) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        height={height}
        preview="live"
      />
    </div>
  );
}
