'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/api/content/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.content.byId(id) });
      void qc.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}
