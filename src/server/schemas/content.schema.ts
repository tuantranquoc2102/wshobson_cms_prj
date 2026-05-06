import { z } from 'zod';

export const ContentTypeEnum = z.enum(['POST', 'PAGE']);
export const ContentStatusEnum = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'ARCHIVED',
]);

const slugRule = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase kebab-case')
  .min(1)
  .max(160);

// Prisma cuid IDs — we keep this loose (string with reasonable length) since
// Zod's built-in `cuid` validator accepts cuid v1 only.
const idRule = z.string().min(1).max(64);

export const CreateContentSchema = z.object({
  type: ContentTypeEnum,
  title: z.string().min(1).max(200),
  slug: slugRule.optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().max(200_000),
  featuredMediaId: idRule.optional(),
  categoryIds: z.array(idRule).max(10).default([]),
  tagIds: z.array(idRule).max(20).default([]),
});

export const UpdateContentSchema = CreateContentSchema.partial().strict();

export const TransitionSchema = z.object({
  to: ContentStatusEnum,
});

export const ScheduleSchema = z.object({
  scheduledFor: z
    .string()
    .datetime()
    .refine((d) => new Date(d) > new Date(), 'Scheduled date must be in the future'),
});

export const ContentListQuerySchema = z.object({
  type: ContentTypeEnum.optional(),
  status: ContentStatusEnum.optional(),
  authorId: idRule.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  categoryId: idRule.optional(),
  tagId: idRule.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateContentInput = z.infer<typeof CreateContentSchema>;
export type UpdateContentInput = z.infer<typeof UpdateContentSchema>;
export type TransitionInput = z.infer<typeof TransitionSchema>;
export type ScheduleInput = z.infer<typeof ScheduleSchema>;
export type ContentListQuery = z.infer<typeof ContentListQuerySchema>;
