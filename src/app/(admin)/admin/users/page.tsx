'use client';

import { UserTable } from '@/components/users/UserTable';
import { RoleGate } from '@/components/admin/RoleGate';

export default function UsersPage() {
  return (
    <RoleGate min="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Invite collaborators and manage their roles.
          </p>
        </div>
        <UserTable />
      </div>
    </RoleGate>
  );
}
