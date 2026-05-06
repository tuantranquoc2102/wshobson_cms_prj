import { Badge } from '@/components/ui/badge';
import type { ContentStatus } from '@/lib/types';

const VARIANTS: Record<ContentStatus, 'secondary' | 'info' | 'success' | 'outline'> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'info',
  PUBLISHED: 'success',
  ARCHIVED: 'outline',
};

const LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
