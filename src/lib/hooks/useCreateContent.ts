'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { CreateContentInput } from '@/server/schemas/content.schema';
import type { ContentDetail } from '@/lib/types';

export function useCreateContent() {
  const qc = useQueryClient();
  return useMutation<ContentDetail, Error, CreateContentInput>({
    mutationFn: (input) => apiClient.post<ContentDetail>('/api/content', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}
