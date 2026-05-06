'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { TagInput } from '@/server/schemas/taxonomy.schema';
import type { Tag } from '@/lib/types';

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation<Tag, Error, TagInput>({
    mutationFn: (input) => apiClient.post<Tag>('/api/tags', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.taxonomy.tags });
    },
  });
}
