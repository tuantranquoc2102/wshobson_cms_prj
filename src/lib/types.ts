// Client-safe shared DTO types. We deliberately avoid importing
// `@prisma/client` from the client; we mirror the relevant string unions.

export type Role = 'ADMIN' | 'EDITOR' | 'AUTHOR';
export type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type ContentType = 'POST' | 'PAGE';
export type MediaKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
};

export type Author = { id: string; name: string | null };

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type MediaItem = {
  id: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  uploadedById: string;
  createdAt: string;
};

/** Item shape returned by GET /api/content (list). */
export type ContentSummary = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
  excerpt: string | null;
  body?: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: Author;
  featuredMedia: MediaItem | null;
  categories: { contentId: string; categoryId: string; category: Category }[];
  tags: { contentId: string; tagId: string; tag: Tag }[];
};

/** Detail shape returned by GET /api/content/[id]. Same as summary + body. */
export type ContentDetail = ContentSummary & { body: string };

export type Revision = {
  id: string;
  contentId: string;
  version: number;
  title: string;
  body: string;
  excerpt: string | null;
  authorId: string;
  createdAt: string;
};

export type ContentFilters = {
  type?: ContentType;
  status?: ContentStatus;
  authorId?: string;
  categoryId?: string;
  tagId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type MediaFilters = {
  page?: number;
  pageSize?: number;
  mime?: string;
};

export type AuthResponse = {
  user: SessionUser;
  accessToken: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
