'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { hasRole } from '@/lib/roles';
import type { Role } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function RoleGate({
  min,
  children,
  fallback,
}: {
  min: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return null;
  if (!hasRole(user, min)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don&apos;t have permission to view this page. Required role: {min}.
        </p>
        <Button asChild variant="outline">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
