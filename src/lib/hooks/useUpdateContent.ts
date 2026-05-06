'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { UpdateContentInput } from '@/server/schemas/content.schema';
import type { ContentDetail } from '@/lib/types';

export function useUpdateContent(id: string) {
  const qc = useQueryClient();
  return useMutation<ContentDetail, Error, UpdateContentInput>({
    mutationFn: (input) => apiClient.patch<ContentDetail>(`/api/content/${id}`, input),
    onSuccess: (data) => {
      qc.setQueryData(qk.content.byId(id), data);
      void qc.invalidateQueries({ queryKey: qk.content.all });
      void qc.invalidateQueries({ queryKey: qk.content.revisions(id) });
    },
  });
}
