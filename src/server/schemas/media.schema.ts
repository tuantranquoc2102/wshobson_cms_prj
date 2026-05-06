import { z } from 'zod';

export const MediaUploadMetaSchema = z.object({
  altText: z.string().max(300).optional(),
});

export const MediaListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  mime: z.string().max(120).optional(),
});

export type MediaUploadMetaInput = z.infer<typeof MediaUploadMetaSchema>;
export type MediaListQuery = z.infer<typeof MediaListQuerySchema>;
