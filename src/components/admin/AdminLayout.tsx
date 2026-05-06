'use client';

import type { ReactNode } from 'react';
import { AuthGate } from './AuthGate';
import { RoleGate } from './RoleGate';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RoleGate min="AUTHOR">
        <div className="flex min-h-screen bg-muted/20">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar />
            <main className="flex-1 overflow-auto p-6">
              <AdminBreadcrumbs />
              {children}
            </main>
          </div>
        </div>
      </RoleGate>
    </AuthGate>
  );
}
