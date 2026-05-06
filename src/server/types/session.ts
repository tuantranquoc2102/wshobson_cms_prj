import type { Role } from '@prisma/client';

/**
 * Compact representation of the authenticated user attached to every
 * authorized request. Built from the JWT payload + a fresh DB lookup
 * inside `withAuth`.
 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};
