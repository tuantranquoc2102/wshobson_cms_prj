'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CategorySchema,
  type CategoryInput,
} from '@/server/schemas/taxonomy.schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useCategories } from '@/lib/hooks/useCategories';
import { useCreateCategory } from '@/lib/hooks/useCreateCategory';
import { useUpdateCategory } from '@/lib/hooks/useUpdateCategory';
import { useDeleteCategory } from '@/lib/hooks/useDeleteCategory';
import type { Category } from '@/lib/types';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';

export function CategoryTable() {
  const { data = [], isLoading } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const columns: Column<Category>[] = [
    { key: 'name', header: 'Name', cell: (r) => r.name },
    { key: 'slug', header: 'Slug', cell: (r) => r.slug },
    {
      key: 'description',
      header: 'Description',
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.description ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (r) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditing(r)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setConfirmId(r.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New category
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyTitle="No categories yet"
      />

      <CategoryDialog
        open={creating}
        title="New category"
        onOpenChange={setCreating}
        loading={create.isPending}
        onSubmit={async (input) => {
          try {
            await create.mutateAsync(input);
            toast.success('Category created');
            setCreating(false);
          } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
            throw err;
          }
        }}
      />

      <CategoryDialog
        open={!!editing}
        title="Edit category"
        defaultValues={
          editing
            ? {
                name: editing.name,
                slug: editing.slug,
                description: editing.description ?? '',
              }
            : undefined
        }
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        loading={update.isPending}
        onSubmit={async (input) => {
          if (!editing) return;
          try {
            await update.mutateAsync({ id: editing.id, input });
            toast.success('Category updated');
            setEditing(null);
          } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
            throw err;
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) => {
          if (!v) setConfirmId(null);
        }}
        title="Delete category?"
        description="This is blocked if any content uses the category."
        destructive
        confirmLabel="Delete"
        loading={del.isPending}
        onConfirm={async () => {
          if (!confirmId) return;
          try {
            await del.mutateAsync(confirmId);
            toast.success('Deleted');
            setConfirmId(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Delete failed');
          }
        }}
      />
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  defaultValues?: CategoryInput;
  loading?: boolean;
  onSubmit: (input: CategoryInput) => Promise<void>;
}) {
  const form = useForm<CategoryInput>({
    resolver: zodResolver(CategorySchema),
    defaultValues: defaultValues ?? { name: '', slug: undefined, description: '' },
  });

  // Reset when dialog opens with new defaults
  if (open && defaultValues && form.getValues().name !== defaultValues.name) {
    form.reset(defaultValues);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (v) => {
              try {
                await onSubmit({
                  name: v.name,
                  slug: v.slug && v.slug.length > 0 ? v.slug : undefined,
                  description: v.description && v.description.length > 0 ? v.description : undefined,
                });
                form.reset();
              } catch {
                // toast handled in onSubmit
              }
            })}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Spinner className="text-primary-foreground" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
