// Module-level access-token store. Living only in memory means a refresh
// across tabs/windows requires a fresh /api/auth/refresh call, but the
// access-token blast radius is reduced because XSS can't read it from
// localStorage.
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (t: string | null): void => {
    accessToken = t;
  },
  clear: (): void => {
    accessToken = null;
  },
};
