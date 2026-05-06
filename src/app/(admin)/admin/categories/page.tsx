'use client';

import { CategoryTable } from '@/components/taxonomy/CategoryTable';
import { RoleGate } from '@/components/admin/RoleGate';

export default function CategoriesPage() {
  return (
    <RoleGate min="EDITOR">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Group posts into top-level sections.
          </p>
        </div>
        <CategoryTable />
      </div>
    </RoleGate>
  );
}
