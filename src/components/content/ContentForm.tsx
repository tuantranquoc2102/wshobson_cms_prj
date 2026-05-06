'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateContentSchema,
  type CreateContentInput,
  type UpdateContentInput,
} from '@/server/schemas/content.schema';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryPicker } from './CategoryPicker';
import { TagPicker } from './TagPicker';
import { StatusBadge } from './StatusBadge';
import { TransitionButtons } from './TransitionButtons';
import { SchedulePicker } from './SchedulePicker';
import { RevisionList } from './RevisionList';
import { MediaPicker } from '@/components/media/MediaPicker';
import { useCreateContent } from '@/lib/hooks/useCreateContent';
import { useUpdateContent } from '@/lib/hooks/useUpdateContent';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContentDetail, ContentStatus, ContentType } from '@/lib/types';

const MarkdownEditor = dynamic(
  () => import('./MarkdownEditor').then((m) => ({ default: m.MarkdownEditor })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full" />,
  },
);

type Mode =
  | { kind: 'create' }
  | { kind: 'edit'; content: ContentDetail };

export function ContentForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const create = useCreateContent();
  const update = useUpdateContent(mode.kind === 'edit' ? mode.content.id : '');

  const initial = useMemo<CreateContentInput>(() => {
    if (mode.kind === 'edit') {
      return {
        type: mode.content.type,
        title: mode.content.title,
        slug: mode.content.slug,
        excerpt: mode.content.excerpt ?? '',
        body: mode.content.body,
        featuredMediaId: mode.content.featuredMedia?.id ?? undefined,
        categoryIds: (mode.content.categories ?? []).map((c) => c.categoryId),
        tagIds: (mode.content.tags ?? []).map((t) => t.tagId),
      };
    }
    return {
      type: 'POST',
      title: '',
      slug: undefined,
      excerpt: '',
      body: '',
      featuredMediaId: undefined,
      categoryIds: [],
      tagIds: [],
    };
  }, [mode]);

  const form = useForm<CreateContentInput>({
    resolver: zodResolver(CreateContentSchema),
    defaultValues: initial,
  });

  useEffect(() => {
    form.reset(initial);
  }, [initial, form]);

  // Auto-fill slug from title when slug field is untouched.
  const titleValue = form.watch('title');
  useEffect(() => {
    if (mode.kind !== 'create') return;
    const cur = form.getValues('slug');
    if (cur && form.formState.dirtyFields.slug) return;
    if (!titleValue) return;
    const generated = titleValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160);
    if (generated && generated !== cur) {
      form.setValue('slug', generated, { shouldDirty: false });
    }
  }, [titleValue, mode.kind, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // Drop empty optional strings; the backend treats them as missing.
      const cleaned: CreateContentInput = {
        ...values,
        excerpt: values.excerpt && values.excerpt.length > 0 ? values.excerpt : undefined,
        slug: values.slug && values.slug.length > 0 ? values.slug : undefined,
        featuredMediaId: values.featuredMediaId || undefined,
      };
      if (mode.kind === 'create') {
        const created = await create.mutateAsync(cleaned);
        toast.success('Draft created');
        router.push(`/admin/content/${created.id}/edit`);
      } else {
        // For PATCH we send only field deltas and never `type` (server schema
        // is `.strict()` for partial; sending `type` is fine but we omit
        // categoryIds/tagIds/etc when they are unchanged-ish; simpler: send all).
        const patch: UpdateContentInput = {
          title: cleaned.title,
          slug: cleaned.slug,
          excerpt: cleaned.excerpt,
          body: cleaned.body,
          featuredMediaId: cleaned.featuredMediaId,
          categoryIds: cleaned.categoryIds,
          tagIds: cleaned.tagIds,
        };
        await update.mutateAsync(patch);
        toast.success('Saved');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          for (const [k, v] of Object.entries(err.fields)) {
            form.setError(k as keyof CreateContentInput, {
              message: v.join(', '),
            });
          }
        }
        toast.error(err.message);
      } else {
        toast.error('Save failed');
      }
    }
  });

  const status: ContentStatus =
    mode.kind === 'edit' ? mode.content.status : 'DRAFT';
  const submitting = create.isPending || update.isPending;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as ContentType)}
                      disabled={mode.kind === 'edit'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="POST">Post</SelectItem>
                        <SelectItem value="PAGE">Page</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My great post" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="auto-generated"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase, hyphenated. Auto-generated from the title; edit if you need a stable URL.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A short summary used on the homepage and in social previews."
                        rows={3}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Body</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MarkdownEditor
                        value={field.value ?? ''}
                        onChange={(v) => field.onChange(v)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/content')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner className="text-primary-foreground" /> : null}
              {mode.kind === 'create' ? 'Create draft' : 'Save changes'}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge status={status} />
              {mode.kind === 'edit' ? (
                <TransitionButtons
                  contentId={mode.content.id}
                  authorId={mode.content.authorId}
                  currentStatus={status}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Save the draft first, then submit it for review.
                </p>
              )}
            </CardContent>
          </Card>

          {mode.kind === 'edit' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <SchedulePicker
                  contentId={mode.content.id}
                  status={mode.content.status}
                  scheduledFor={mode.content.scheduledFor}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Featured media</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="featuredMediaId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MediaPicker
                        value={field.value ?? null}
                        onChange={(id) => field.onChange(id ?? undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="categoryIds"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <CategoryPicker
                        value={field.value ?? []}
                        onChange={(ids) => field.onChange(ids)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TagPicker
                        value={field.value ?? []}
                        onChange={(ids) => field.onChange(ids)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {mode.kind === 'edit' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent revisions</CardTitle>
              </CardHeader>
              <CardContent>
                <RevisionList contentId={mode.content.id} />
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </form>
    </Form>
  );
}
