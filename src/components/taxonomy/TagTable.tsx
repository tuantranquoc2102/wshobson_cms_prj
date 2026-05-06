'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TagSchema, type TagInput } from '@/server/schemas/taxonomy.schema';
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
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useTags } from '@/lib/hooks/useTags';
import { useCreateTag } from '@/lib/hooks/useCreateTag';
import { useUpdateTag } from '@/lib/hooks/useUpdateTag';
import { useDeleteTag } from '@/lib/hooks/useDeleteTag';
import type { Tag } from '@/lib/types';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';

export function TagTable() {
  const { data = [], isLoading } = useTags();
  const create = useCreateTag();
  const update = useUpdateTag();
  const del = useDeleteTag();

  const [editing, setEditing] = useState<Tag | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const columns: Column<Tag>[] = [
    { key: 'name', header: 'Name', cell: (r) => r.name },
    { key: 'slug', header: 'Slug', cell: (r) => r.slug },
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
          New tag
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyTitle="No tags yet"
      />

      <TagDialog
        open={creating}
        title="New tag"
        onOpenChange={setCreating}
        loading={create.isPending}
        onSubmit={async (input) => {
          try {
            await create.mutateAsync(input);
            toast.success('Tag created');
            setCreating(false);
          } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
            throw err;
          }
        }}
      />

      <TagDialog
        open={!!editing}
        title="Edit tag"
        defaultValues={editing ? { name: editing.name, slug: editing.slug } : undefined}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        loading={update.isPending}
        onSubmit={async (input) => {
          if (!editing) return;
          try {
            await update.mutateAsync({ id: editing.id, input });
            toast.success('Tag updated');
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
        title="Delete tag?"
        description="Removes the tag from all posts."
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

function TagDialog({
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
  defaultValues?: TagInput;
  loading?: boolean;
  onSubmit: (input: TagInput) => Promise<void>;
}) {
  const form = useForm<TagInput>({
    resolver: zodResolver(TagSchema),
    defaultValues: defaultValues ?? { name: '', slug: undefined },
  });
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
                });
                form.reset();
              } catch {
                // toast handled
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
