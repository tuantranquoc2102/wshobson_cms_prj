'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
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
import { useCategories } from '@/lib/hooks/useCategories';
import { cn } from '@/lib/utils';

export function CategoryPicker({
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
  const { data: categories = [] } = useCategories();

  const filtered = useMemo(() => {
    if (!q.trim()) return categories;
    const lc = q.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(lc));
  }, [categories, q]);

  const selectedNames = categories.filter((c) => value.includes(c.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
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
            {selectedNames.length > 0
              ? `${selectedNames.length} selected`
              : 'Select categories'}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search categories…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <CommandList>
              {filtered.length === 0 ? (
                <CommandEmpty>No categories</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filtered.map((c) => {
                    const selected = value.includes(c.id);
                    return (
                      <CommandItem
                        key={c.id}
                        selected={selected}
                        onClick={() => toggle(c.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {c.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedNames.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedNames.map((c) => (
            <Badge key={c.id} variant="secondary">
              {c.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
