/**
 * Produce a kebab-case slug from arbitrary text.
 *
 * Rules:
 *  - lowercase
 *  - trim leading/trailing whitespace
 *  - replace whitespace and underscores with `-`
 *  - drop any character outside `[a-z0-9-]`
 *  - collapse runs of `-` into a single `-`
 *  - trim leading/trailing `-`
 *
 * NOTE: this function does NOT guarantee uniqueness. The service layer is
 * responsible for resolving slug collisions (e.g. by suffixing `-2`, `-3`).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
