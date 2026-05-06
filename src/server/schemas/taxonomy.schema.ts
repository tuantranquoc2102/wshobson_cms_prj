import { z } from 'zod';

const slugRule = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase kebab-case')
  .min(1)
  .max(160);

export const CategorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugRule.optional(),
  description: z.string().max(500).optional(),
});

export const TagSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slugRule.optional(),
});

export const TaxonomyListQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
});

export type CategoryInput = z.infer<typeof CategorySchema>;
export type TagInput = z.infer<typeof TagSchema>;
export type TaxonomyListQuery = z.infer<typeof TaxonomyListQuerySchema>;
