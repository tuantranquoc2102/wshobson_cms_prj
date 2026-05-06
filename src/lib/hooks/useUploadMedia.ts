'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { qk } from '@/lib/queryKeys';
import type { MediaItem } from '@/lib/types';

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation<MediaItem, Error, { file: File; altText?: string }>({
    mutationFn: ({ file, altText }) => {
      const fd = new FormData();
      fd.append('file', file);
      if (altText) fd.append('altText', altText);
      return apiClient.post<MediaItem>('/api/media', fd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.media.all });
    },
  });
}
