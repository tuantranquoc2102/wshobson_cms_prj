'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { ContentDetail } from '@/lib/types';

export function useContent(id: string | undefined) {
  return useQuery<ContentDetail>({
    queryKey: id ? qk.content.byId(id) : ['content', 'byId', 'null'],
    queryFn: () => apiClient.get<ContentDetail>(`/api/content/${id}`),
    enabled: !!id,
  });
}
