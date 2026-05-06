'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { TagInput } from '@/server/schemas/taxonomy.schema';
import type { Tag } from '@/lib/types';

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation<Tag, Error, { id: string; input: TagInput }>({
    mutationFn: ({ id, input }) =>
      apiClient.patch<Tag>(`/api/tags/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.taxonomy.tags });
    },
  });
}
