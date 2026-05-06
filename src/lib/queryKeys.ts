import type { ContentFilters, MediaFilters } from './types';

export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  content: {
    all: ['content'] as const,
    list: (f: ContentFilters) => ['content', 'list', f] as const,
    byId: (id: string) => ['content', 'byId', id] as const,
    revisions: (id: string) => ['content', 'revisions', id] as const,
  },
  taxonomy: {
    categories: ['taxonomy', 'categories'] as const,
    tags: ['taxonomy', 'tags'] as const,
  },
  media: {
    all: ['media'] as const,
    list: (f: MediaFilters) => ['media', 'list', f] as const,
  },
  users: {
    all: ['users'] as const,
    list: ['users', 'list'] as const,
  },
};
