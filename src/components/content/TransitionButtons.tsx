'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/lib/auth/useAuth';
import { useTransitionStatus } from '@/lib/hooks/useTransitionStatus';
import type { ContentStatus } from '@/lib/types';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';
import { availableTransitions } from './transitions';

const LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Move to Draft',
  IN_REVIEW: 'Submit for review',
  PUBLISHED: 'Publish',
  ARCHIVED: 'Archive',
};

export function TransitionButtons({
  contentId,
  authorId,
  currentStatus,
}: {
  contentId: string;
  authorId: string;
  currentStatus: ContentStatus;
}) {
  const { user } = useAuth();
  const transition = useTransitionStatus(contentId);

  if (!user) return null;
  const isOwner = user.id === authorId;
  const options = availableTransitions(currentStatus, user.role, isOwner);
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((to) => (
        <Button
          key={to}
          type="button"
          variant={to === 'PUBLISHED' ? 'default' : 'outline'}
          size="sm"
          disabled={transition.isPending}
          onClick={() => {
            transition.mutate(
              { to },
              {
                onSuccess: () => toast.success(`Status changed to ${to}`),
                onError: (err) => {
                  toast.error(err instanceof ApiError ? err.message : 'Transition failed');
                },
              },
            );
          }}
        >
          {transition.isPending && transition.variables?.to === to ? (
            <Spinner />
          ) : null}
          {LABELS[to]}
        </Button>
      ))}
    </div>
  );
}
