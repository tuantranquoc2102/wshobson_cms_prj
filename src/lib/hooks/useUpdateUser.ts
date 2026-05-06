'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { UpdateUserInput } from '@/server/schemas/user.schema';
import type { AdminUser } from '@/lib/types';

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<AdminUser, Error, { id: string; input: UpdateUserInput }>({
    mutationFn: ({ id, input }) =>
      apiClient.patch<AdminUser>(`/api/users/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.users.all });
    },
  });
}
