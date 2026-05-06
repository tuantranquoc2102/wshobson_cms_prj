/**
 * Standard pagination input. `page` is 1-indexed.
 */
export type Pagination = {
  page: number;
  pageSize: number;
};

/**
 * Standard paginated response envelope used by every list endpoint.
 */
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Compute zero-based `skip` from a `Pagination` input. Convenience helper
 * for repos so they don't repeat `(page - 1) * pageSize` everywhere.
 */
export function toSkip(p: Pagination): number {
  return Math.max(0, (p.page - 1) * p.pageSize);
}
