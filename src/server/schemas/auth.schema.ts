import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200)
  .refine((s) => /[A-Za-z]/.test(s), 'Password must contain a letter')
  .refine((s) => /[0-9]/.test(s), 'Password must contain a digit');

export const RegisterSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(120),
  password: passwordRule,
});

export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

/** Empty object for endpoints that take no body but want a typed parse. */
export const EmptySchema = z.object({}).strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
