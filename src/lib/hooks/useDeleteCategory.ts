'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/api/categories/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.taxonomy.categories });
    },
  });
}
