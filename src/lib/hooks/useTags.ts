'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { Tag } from '@/lib/types';

export function useTags(q?: string) {
  return useQuery<Tag[]>({
    queryKey: q ? [...qk.taxonomy.tags, q] : qk.taxonomy.tags,
    queryFn: () =>
      apiClient.get<Tag[]>(`/api/tags${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });
}
