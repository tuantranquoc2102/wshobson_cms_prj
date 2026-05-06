import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodIssue } from 'zod';
import { ApiError } from './apiError';
import { logger } from '@/server/lib/logger';

/** Convert a ZodIssue[] into `{ "path.to.field": ["message", ...] }`. */
export function zodFieldMap(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues as ZodIssue[]) {
    const key = issue.path.length === 0 ? '_' : issue.path.join('.');
    const list = out[key] ?? [];
    list.push(issue.message);
    out[key] = list;
  }
  return out;
}

type ErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
};

/** Map any thrown value into a JSON `Response`. */
export function toResponse(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: {
        code: 'UNPROCESSABLE',
        message: 'Validation failed',
        fields: zodFieldMap(err),
      },
    };
    return NextResponse.json(body, { status: 422 });
  }
  if (err instanceof ApiError) {
    const body: ErrorBody = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    };
    return NextResponse.json(body, { status: err.status });
  }
  logger.error({ err }, 'unhandled');
  const body: ErrorBody = {
    error: { code: 'INTERNAL', message: 'Internal server error' },
  };
  return NextResponse.json(body, { status: 500 });
}

/** 200 OK helper that returns a typed JSON `NextResponse`. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

/** 204 No Content helper. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
