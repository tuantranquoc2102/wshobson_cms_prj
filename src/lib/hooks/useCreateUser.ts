'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { CreateUserInput } from '@/server/schemas/user.schema';
import type { AdminUser } from '@/lib/types';

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<AdminUser, Error, CreateUserInput>({
    mutationFn: (input) => apiClient.post<AdminUser>('/api/users', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.users.all });
    },
  });
}
