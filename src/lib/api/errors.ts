/**
 * Client-side mirror of the server's `ApiError`. The `apiClient` throws this
 * on any non-2xx response, mapping the JSON `error` envelope.
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
