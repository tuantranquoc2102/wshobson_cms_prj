'use client';

import Link from 'next/link';
import { FileText, Inbox, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useContentList } from '@/lib/hooks/useContentList';
import { ContentTable } from '@/components/content/ContentTable';

export default function AdminDashboardPage() {
  const drafts = useContentList({ status: 'DRAFT', pageSize: 5 });
  const inReview = useContentList({ status: 'IN_REVIEW', pageSize: 5 });
  const published = useContentList({ status: 'PUBLISHED', pageSize: 5 });
  const recent = useContentList({ pageSize: 10 });

  const cards = [
    {
      key: 'drafts',
      label: 'Drafts',
      icon: FileText,
      count: drafts.data?.total,
      loading: drafts.isLoading,
      href: '/admin/content?status=DRAFT',
    },
    {
      key: 'inReview',
      label: 'In review',
      icon: Inbox,
      count: inReview.data?.total,
      loading: inReview.isLoading,
      href: '/admin/review-queue',
    },
    {
      key: 'published',
      label: 'Published',
      icon: CheckCircle2,
      count: published.data?.total,
      loading: published.isLoading,
      href: '/admin/content?status=PUBLISHED',
    },
    {
      key: 'scheduled',
      label: 'Total content',
      icon: Clock,
      count: recent.data?.total,
      loading: recent.isLoading,
      href: '/admin/content',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your content workflow.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content/new">New post</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key}>
              <Link href={c.href} className="block">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {c.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {c.loading ? <Spinner className="h-4 w-4" /> : (c.count ?? 0)}
                  </div>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>The 10 most recently updated items.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContentTable
            rows={recent.data?.items ?? []}
            loading={recent.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
