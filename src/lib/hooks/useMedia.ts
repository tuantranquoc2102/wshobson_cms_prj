'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { MediaFilters, MediaItem, Page } from '@/lib/types';

function toQueryString(filters: MediaFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.mime) params.set('mime', filters.mime);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useMedia(filters: MediaFilters = {}) {
  return useQuery<Page<MediaItem>>({
    queryKey: qk.media.list(filters),
    queryFn: () =>
      apiClient.get<Page<MediaItem>>(`/api/media${toQueryString(filters)}`),
  });
}
