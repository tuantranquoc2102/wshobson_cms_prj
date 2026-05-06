import { z } from 'zod';

export const RoleEnum = z.enum(['ADMIN', 'EDITOR', 'AUTHOR']);

const passwordRule = z
  .string()
  .min(8)
  .max(200)
  .refine((s) => /[A-Za-z]/.test(s), 'Password must contain a letter')
  .refine((s) => /[0-9]/.test(s), 'Password must contain a digit');

export const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(120),
  role: RoleEnum,
  password: passwordRule,
});

/**
 * Admin update form: change role and/or soft-delete the user.
 * The DB has no `isActive` column; soft-delete via `deletedAt` is the
 * equivalent end-state.
 */
export const UpdateUserSchema = z
  .object({
    role: RoleEnum.optional(),
    softDeleted: z.boolean().optional(),
  })
  .refine(
    (v) => v.role !== undefined || v.softDeleted !== undefined,
    'At least one field must be provided',
  );

export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().min(1).max(120).optional(),
  role: RoleEnum.optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserListQueryInput = z.infer<typeof UserListQuerySchema>;
