'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { ContentDetail, ContentStatus } from '@/lib/types';

export function useTransitionStatus(id: string) {
  const qc = useQueryClient();
  return useMutation<
    ContentDetail,
    Error,
    { to: ContentStatus },
    { previous: ContentDetail | undefined }
  >({
    mutationFn: ({ to }) =>
      apiClient.post<ContentDetail>(`/api/content/${id}/transition`, { to }),
    onMutate: async ({ to }) => {
      await qc.cancelQueries({ queryKey: qk.content.byId(id) });
      const previous = qc.getQueryData<ContentDetail>(qk.content.byId(id));
      if (previous) {
        qc.setQueryData<ContentDetail>(qk.content.byId(id), {
          ...previous,
          status: to,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.content.byId(id), ctx.previous);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(qk.content.byId(id), data);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}
