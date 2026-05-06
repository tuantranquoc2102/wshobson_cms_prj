'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTags } from '@/lib/hooks/useTags';
import { useCreateTag } from '@/lib/hooks/useCreateTag';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/errors';
import { toast } from 'sonner';
import { hasRole } from '@/lib/roles';
import { useAuth } from '@/lib/auth/useAuth';

export function TagPicker({
  value,
  onChange,
  className,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const { user } = useAuth();
  const canCreate = hasRole(user, 'EDITOR');

  const filtered = useMemo(() => {
    if (!q.trim()) return tags;
    const lc = q.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(lc));
  }, [tags, q]);

  const showCreate =
    canCreate &&
    q.trim().length > 0 &&
    !tags.some((t) => t.name.toLowerCase() === q.trim().toLowerCase());

  const selected = tags.filter((t) => value.includes(t.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleCreate = async () => {
    try {
      const t = await createTag.mutateAsync({ name: q.trim() });
      onChange([...value, t.id]);
      setQ('');
      toast.success(`Tag “${t.name}” created`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create tag');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {selected.length > 0 ? `${selected.length} selected` : 'Select tags'}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={canCreate ? 'Search or create tag…' : 'Search tags…'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && showCreate) {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
            />
            <CommandList>
              {filtered.length === 0 && !showCreate ? (
                <CommandEmpty>No tags</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filtered.map((t) => {
                    const isSel = value.includes(t.id);
                    return (
                      <CommandItem
                        key={t.id}
                        selected={isSel}
                        onClick={() => toggle(t.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSel ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {t.name}
                      </CommandItem>
                    );
                  })}
                  {showCreate ? (
                    <CommandItem
                      onClick={() => void handleCreate()}
                      disabled={createTag.isPending}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create &ldquo;{q.trim()}&rdquo;
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((t) => (
            <Badge key={t.id} variant="secondary">
              #{t.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
