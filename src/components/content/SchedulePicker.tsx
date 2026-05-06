'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useScheduleContent } from '@/lib/hooks/useScheduleContent';
import type { ContentStatus } from '@/lib/types';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { hasRole } from '@/lib/roles';
import { useAuth } from '@/lib/auth/useAuth';

export function SchedulePicker({
  contentId,
  status,
  scheduledFor,
}: {
  contentId: string;
  status: ContentStatus;
  scheduledFor: string | null;
}) {
  const { user } = useAuth();
  const [value, setValue] = useState<string>(
    scheduledFor ? new Date(scheduledFor).toISOString().slice(0, 16) : '',
  );
  const schedule = useScheduleContent(contentId);

  if (!user || !hasRole(user, 'EDITOR')) return null;
  if (status !== 'DRAFT' && status !== 'IN_REVIEW') {
    return scheduledFor ? (
      <p className="text-sm text-muted-foreground">
        Scheduled for {formatDate(scheduledFor, 'datetime')}
      </p>
    ) : null;
  }

  const handleSchedule = () => {
    if (!value) {
      toast.error('Pick a date');
      return;
    }
    const iso = new Date(value).toISOString();
    schedule.mutate(
      { scheduledFor: iso },
      {
        onSuccess: () => toast.success('Schedule updated'),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : 'Schedule failed'),
      },
    );
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Schedule
      </label>
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={schedule.isPending}
        onClick={handleSchedule}
      >
        {schedule.isPending ? <Spinner /> : null}
        {scheduledFor ? 'Reschedule' : 'Schedule'}
      </Button>
      {scheduledFor ? (
        <p className="text-xs text-muted-foreground">
          Currently scheduled for {formatDate(scheduledFor, 'datetime')}
        </p>
      ) : null}
    </div>
  );
}
