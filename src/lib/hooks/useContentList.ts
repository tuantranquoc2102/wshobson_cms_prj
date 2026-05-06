'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { ContentFilters, ContentSummary, Page } from '@/lib/types';

function toQueryString(filters: ContentFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.authorId) params.set('authorId', filters.authorId);
  if (filters.q) params.set('q', filters.q);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.tagId) params.set('tagId', filters.tagId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useContentList(filters: ContentFilters, enabled = true) {
  return useQuery<Page<ContentSummary>>({
    queryKey: qk.content.list(filters),
    queryFn: () => apiClient.get<Page<ContentSummary>>(`/api/content${toQueryString(filters)}`),
    enabled,
  });
}
