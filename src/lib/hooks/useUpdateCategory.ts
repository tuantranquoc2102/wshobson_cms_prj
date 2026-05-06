'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { CategoryInput } from '@/server/schemas/taxonomy.schema';
import type { Category } from '@/lib/types';

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation<Category, Error, { id: string; input: CategoryInput }>({
    mutationFn: ({ id, input }) =>
      apiClient.patch<Category>(`/api/categories/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.taxonomy.categories });
    },
  });
}
