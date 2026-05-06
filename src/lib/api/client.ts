import { ApiError } from './errors';
import { tokenStore } from '@/lib/auth/tokenStore';

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!r.ok) return false;
        const json = (await r.json()) as { accessToken?: string };
        if (!json.accessToken) return false;
        tokenStore.set(json.accessToken);
        return true;
      } catch {
        return false;
      }
    })();
  }
  const result = await refreshing;
  refreshing = null;
  return result;
}

type RequestInitOpts = Omit<RequestInit, 'body' | 'method'>;

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  init?: RequestInitOpts,
): Promise<T> {
  const isForm = body instanceof FormData;
  const make = (): Promise<Response> =>
    fetch(url, {
      method,
      credentials: 'include',
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(tokenStore.get() ? { Authorization: `Bearer ${tokenStore.get()}` } : {}),
        ...(init?.headers ?? {}),
      },
      body: isForm
        ? (body as FormData)
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
      ...init,
    });

  let res = await make();

  if (
    res.status === 401 &&
    !url.startsWith('/api/auth/refresh') &&
    !url.startsWith('/api/auth/login') &&
    !url.startsWith('/api/auth/register')
  ) {
    const ok = await tryRefresh();
    if (!ok) {
      if (typeof window !== 'undefined') {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        // Avoid bouncing while we're already on /login.
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?next=${next}`;
        }
      }
      throw new ApiError('UNAUTHORIZED', 'Session expired', 401);
    }
    res = await make();
  }

  if (!res.ok) {
    let payload: { error?: { code?: string; message?: string; fields?: Record<string, string[]> } } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      // ignore parse errors — we'll fall through to defaults
    }
    throw new ApiError(
      payload.error?.code ?? 'INTERNAL',
      payload.error?.message ?? 'Request failed',
      res.status,
      payload.error?.fields,
    );
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(url: string, init?: RequestInitOpts) => request<T>('GET', url, undefined, init),
  post: <T>(url: string, body?: unknown, init?: RequestInitOpts) =>
    request<T>('POST', url, body, init),
  patch: <T>(url: string, body?: unknown, init?: RequestInitOpts) =>
    request<T>('PATCH', url, body, init),
  put: <T>(url: string, body?: unknown, init?: RequestInitOpts) =>
    request<T>('PUT', url, body, init),
  delete: <T>(url: string, init?: RequestInitOpts) =>
    request<T>('DELETE', url, undefined, init),
};

export { ApiError };
