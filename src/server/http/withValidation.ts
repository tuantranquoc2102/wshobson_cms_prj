import 'server-only';
import type { NextRequest } from 'next/server';
import type { ZodSchema, z } from 'zod';
import { ApiError } from './apiError';

/**
 * Parse the JSON body of a request through `schema` and return the typed
 * result. Throws `ZodError` (mapped to 422 by `toResponse`) on validation
 * failure, or `ApiError(BAD_REQUEST)` if the body isn't valid JSON.
 */
export async function validateBody<S extends ZodSchema>(
  schema: S,
  req: NextRequest,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }
  return schema.parse(raw);
}

/**
 * Parse `?…` search params through `schema`. Coerces are applied by Zod
 * (use `z.coerce.*`) since URLSearchParams returns strings.
 */
export function validateQuery<S extends ZodSchema>(
  schema: S,
  req: NextRequest,
): z.infer<S> {
  const obj: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return schema.parse(obj);
}
