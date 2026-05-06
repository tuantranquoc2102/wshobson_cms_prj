'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { Spinner } from '@/components/ui/spinner';

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const next =
        encodeURIComponent(`${pathname}${search.toString() ? `?${search.toString()}` : ''}`);
      router.replace(`/login?next=${next}`);
    }
  }, [status, router, pathname, search]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (status !== 'authenticated') {
    return null;
  }
  return <>{children}</>;
}
