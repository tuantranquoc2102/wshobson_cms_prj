'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateUserSchema,
  type CreateUserInput,
} from '@/server/schemas/user.schema';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useUsers } from '@/lib/hooks/useUsers';
import { useCreateUser } from '@/lib/hooks/useCreateUser';
import { useUpdateUser } from '@/lib/hooks/useUpdateUser';
import type { AdminUser, Role } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/roles';
import { formatDate } from '@/lib/formatters';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';

export function UserTable() {
  const { data, isLoading } = useUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const [creating, setCreating] = useState(false);
  const items = data?.items ?? [];

  function handleRoleChange(user: AdminUser, role: Role) {
    update.mutate(
      { id: user.id, input: { role } },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : 'Update failed'),
      },
    );
  }

  function handleActiveChange(user: AdminUser, active: boolean) {
    update.mutate(
      { id: user.id, input: { softDeleted: !active } },
      {
        onSuccess: () => toast.success(active ? 'User reactivated' : 'User deactivated'),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : 'Update failed'),
      },
    );
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (r) => (
        <div>
          <p className="font-medium">{r.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (r) => (
        <Select
          value={r.role}
          onValueChange={(v) => handleRoleChange(r, v as Role)}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUTHOR">{ROLE_LABEL.AUTHOR}</SelectItem>
            <SelectItem value="EDITOR">{ROLE_LABEL.EDITOR}</SelectItem>
            <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
          </SelectContent>
        </Select>
      ),
      className: 'w-40',
    },
    {
      key: 'active',
      header: 'Active',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={!r.deletedAt}
            onCheckedChange={(v) => handleActiveChange(r, v)}
          />
          {r.deletedAt ? (
            <Badge variant="outline">Inactive</Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          )}
        </div>
      ),
      className: 'w-40',
    },
    {
      key: 'createdAt',
      header: 'Created',
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(r.createdAt, 'short')}
        </span>
      ),
      className: 'w-32',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New user
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyTitle="No users yet"
      />

      <CreateUserDialog
        open={creating}
        onOpenChange={setCreating}
        loading={create.isPending}
        onSubmit={async (input) => {
          try {
            await create.mutateAsync(input);
            toast.success('User created');
            setCreating(false);
          } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
            throw err;
          }
        }}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading?: boolean;
  onSubmit: (input: CreateUserInput) => Promise<void>;
}) {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { email: '', name: '', role: 'AUTHOR', password: '' },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (v) => {
              try {
                await onSubmit(v);
                form.reset();
              } catch {
                // handled
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as Role)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AUTHOR">{ROLE_LABEL.AUTHOR}</SelectItem>
                      <SelectItem value="EDITOR">{ROLE_LABEL.EDITOR}</SelectItem>
                      <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
