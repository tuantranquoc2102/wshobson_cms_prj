'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '@/lib/api/client';
import { tokenStore } from './tokenStore';
import type { AuthResponse, SessionUser } from '@/lib/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthContextValue = {
  user: SessionUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (input: { email: string; name: string; password: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const bootedRef = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiClient.get<SessionUser>('/api/auth/me');
      setUser(me);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    void (async () => {
      // Try to obtain a fresh access token from the refresh cookie before
      // hitting /me. This lets a returning user skate past loading without
      // a 401 → refresh → retry round-trip.
      try {
        const r = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (r.ok) {
          const json = (await r.json()) as { accessToken?: string };
          if (json.accessToken) tokenStore.set(json.accessToken);
        }
      } catch {
        // ignore — /me below will set the unauthenticated state
      }
      await refreshUser();
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
    tokenStore.set(res.accessToken);
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const register = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      const res = await apiClient.post<AuthResponse>('/api/auth/register', input);
      tokenStore.set(res.accessToken);
      setUser(res.user);
      setStatus('authenticated');
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // best-effort
    }
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refreshUser }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
