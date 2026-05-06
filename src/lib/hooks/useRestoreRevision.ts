'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { ContentDetail } from '@/lib/types';

export function useRestoreRevision(id: string) {
  const qc = useQueryClient();
  return useMutation<ContentDetail, Error, number>({
    mutationFn: (version) =>
      apiClient.post<ContentDetail>(
        `/api/content/${id}/revisions/${version}/restore`,
      ),
    onSuccess: (data) => {
      qc.setQueryData(qk.content.byId(id), data);
      void qc.invalidateQueries({ queryKey: qk.content.revisions(id) });
      void qc.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}
