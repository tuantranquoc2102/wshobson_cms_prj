import type { Role, SessionUser } from './types';

const RANK: Record<Role, number> = {
  AUTHOR: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export function hasRole(
  user: Pick<SessionUser, 'role'> | null | undefined,
  min: Role,
): boolean {
  if (!user) return false;
  return RANK[user.role] >= RANK[min];
}

export function isEditorPlus(user: Pick<SessionUser, 'role'> | null | undefined): boolean {
  return hasRole(user, 'EDITOR');
}

export function isAdmin(user: Pick<SessionUser, 'role'> | null | undefined): boolean {
  return hasRole(user, 'ADMIN');
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  AUTHOR: 'Author',
};
