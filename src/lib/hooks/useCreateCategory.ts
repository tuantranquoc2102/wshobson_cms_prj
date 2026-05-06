'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { CategoryInput } from '@/server/schemas/taxonomy.schema';
import type { Category } from '@/lib/types';

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<Category, Error, CategoryInput>({
    mutationFn: (input) => apiClient.post<Category>('/api/categories', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.taxonomy.categories });
    },
  });
}
