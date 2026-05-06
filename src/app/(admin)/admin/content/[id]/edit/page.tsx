'use client';

import { use } from 'react';
import { ContentForm } from '@/components/content/ContentForm';
import { useContent } from '@/lib/hooks/useContent';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/common/EmptyState';

export default function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useContent(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (error || !data) {
    return <EmptyState title="Content not found" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit content</h1>
      <ContentForm mode={{ kind: 'edit', content: data }} />
    </div>
  );
}
