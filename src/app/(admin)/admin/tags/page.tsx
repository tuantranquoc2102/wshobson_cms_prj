'use client';

import { TagTable } from '@/components/taxonomy/TagTable';
import { RoleGate } from '@/components/admin/RoleGate';

export default function TagsPage() {
  return (
    <RoleGate min="EDITOR">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Lightweight labels for cross-cutting topics.
          </p>
        </div>
        <TagTable />
      </div>
    </RoleGate>
  );
}
