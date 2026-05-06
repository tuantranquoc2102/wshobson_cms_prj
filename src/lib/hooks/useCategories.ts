'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { Category } from '@/lib/types';

export function useCategories(q?: string) {
  return useQuery<Category[]>({
    queryKey: q ? [...qk.taxonomy.categories, q] : qk.taxonomy.categories,
    queryFn: () =>
      apiClient.get<Category[]>(`/api/categories${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });
}
