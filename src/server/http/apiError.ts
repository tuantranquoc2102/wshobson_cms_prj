import 'server-only';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

/**
 * Domain error thrown by services and handlers; mapped to a structured
 * JSON response by `toResponse` in respond.ts.
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly fields?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}
