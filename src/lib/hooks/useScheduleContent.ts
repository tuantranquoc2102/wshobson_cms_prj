'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { ContentDetail } from '@/lib/types';

export function useScheduleContent(id: string) {
  const qc = useQueryClient();
  return useMutation<ContentDetail, Error, { scheduledFor: string }>({
    mutationFn: (input) =>
      apiClient.post<ContentDetail>(`/api/content/${id}/schedule`, input),
    onSuccess: (data) => {
      qc.setQueryData(qk.content.byId(id), data);
      void qc.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}
