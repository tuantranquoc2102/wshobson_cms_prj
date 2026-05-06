'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { Page, Revision } from '@/lib/types';

export function useRevisions(id: string | undefined) {
  return useQuery<Page<Revision>>({
    queryKey: id ? qk.content.revisions(id) : ['content', 'revisions', 'null'],
    queryFn: () => apiClient.get<Page<Revision>>(`/api/content/${id}/revisions`),
    enabled: !!id,
  });
}
