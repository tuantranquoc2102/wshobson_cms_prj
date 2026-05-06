import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link href="/" className="mb-6 text-lg font-semibold tracking-tight">
        CMS
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
