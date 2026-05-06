'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContent } from '@/lib/hooks/useContent';
import { RevisionList } from '@/components/content/RevisionList';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/common/EmptyState';

export default function RevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useContent(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!data) {
    return <EmptyState title="Content not found" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revisions</h1>
          <p className="text-sm text-muted-foreground">{data.title}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/content/${id}/edit`}>Back to editor</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <RevisionList contentId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
