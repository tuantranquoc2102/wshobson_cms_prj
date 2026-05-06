'use client';

import { ContentForm } from '@/components/content/ContentForm';

export default function NewContentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New content</h1>
      <ContentForm mode={{ kind: 'create' }} />
    </div>
  );
}
