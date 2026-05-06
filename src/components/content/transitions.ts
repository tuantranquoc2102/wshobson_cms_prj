import type { ContentStatus, Role } from '@/lib/types';

type Transition = { from: ContentStatus; to: ContentStatus; roles: Role[] };

// Mirrors src/server/services/content.service.ts exactly. We keep them in
// sync manually — small enough table that drift is easy to spot in review.
export const TRANSITIONS: Transition[] = [
  { from: 'DRAFT', to: 'IN_REVIEW', roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
  { from: 'DRAFT', to: 'ARCHIVED', roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
  { from: 'DRAFT', to: 'PUBLISHED', roles: ['EDITOR', 'ADMIN'] },
  { from: 'IN_REVIEW', to: 'DRAFT', roles: ['AUTHOR', 'EDITOR', 'ADMIN'] },
  { from: 'IN_REVIEW', to: 'PUBLISHED', roles: ['EDITOR', 'ADMIN'] },
  { from: 'IN_REVIEW', to: 'ARCHIVED', roles: ['EDITOR', 'ADMIN'] },
  { from: 'PUBLISHED', to: 'ARCHIVED', roles: ['EDITOR', 'ADMIN'] },
  { from: 'PUBLISHED', to: 'DRAFT', roles: ['EDITOR', 'ADMIN'] },
  { from: 'ARCHIVED', to: 'DRAFT', roles: ['EDITOR', 'ADMIN'] },
];

export function availableTransitions(
  from: ContentStatus,
  role: Role,
  isOwner: boolean,
): ContentStatus[] {
  return TRANSITIONS.filter((t) => {
    if (t.from !== from) return false;
    if (!t.roles.includes(role)) return false;
    if (role === 'AUTHOR' && !isOwner) return false;
    return true;
  }).map((t) => t.to);
}
