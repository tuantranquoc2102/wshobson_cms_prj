'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/api/media/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.media.all });
    },
  });
}
