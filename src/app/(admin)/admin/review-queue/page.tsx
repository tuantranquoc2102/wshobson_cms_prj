'use client';

import { RoleGate } from '@/components/admin/RoleGate';
import { ContentTable } from '@/components/content/ContentTable';
import { useContentList } from '@/lib/hooks/useContentList';

export default function ReviewQueuePage() {
  const { data, isLoading } = useContentList({
    status: 'IN_REVIEW',
    pageSize: 50,
  });
  return (
    <RoleGate min="EDITOR">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
          <p className="text-sm text-muted-foreground">
            Items submitted for editorial review. Approve to publish or send
            back to draft.
          </p>
        </div>
        <ContentTable rows={data?.items ?? []} loading={isLoading} />
      </div>
    </RoleGate>
  );
}
