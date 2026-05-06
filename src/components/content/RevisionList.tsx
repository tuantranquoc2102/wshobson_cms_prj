'use client';

import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useRevisions } from '@/lib/hooks/useRevisions';
import { useRestoreRevision } from '@/lib/hooks/useRestoreRevision';
import { useAuth } from '@/lib/auth/useAuth';
import { hasRole } from '@/lib/roles';
import { formatRelative } from '@/lib/formatters';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';

export function RevisionList({ contentId }: { contentId: string }) {
  const { data, isLoading } = useRevisions(contentId);
  const restore = useRestoreRevision(contentId);
  const { user } = useAuth();
  const canRestore = hasRole(user, 'EDITOR');

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }
  const revisions = data?.items ?? [];
  if (revisions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No revisions yet.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {revisions.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between rounded-md border p-2 text-sm"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium">
              <History className="h-3 w-3" />v{r.version}
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {r.title} · {formatRelative(r.createdAt)}
            </p>
          </div>
          {canRestore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restore.isPending}
              onClick={() => {
                if (
                  !confirm(
                    `Restore content to revision v${r.version}? Current state will be saved as a new revision.`,
                  )
                )
                  return;
                restore.mutate(r.version, {
                  onSuccess: () => toast.success(`Restored v${r.version}`),
                  onError: (err) =>
                    toast.error(
                      err instanceof ApiError ? err.message : 'Restore failed',
                    ),
                });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
