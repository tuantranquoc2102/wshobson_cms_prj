'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { AdminUser, Page } from '@/lib/types';

export function useUsers() {
  return useQuery<Page<AdminUser>>({
    queryKey: qk.users.list,
    queryFn: () => apiClient.get<Page<AdminUser>>('/api/users'),
  });
}
