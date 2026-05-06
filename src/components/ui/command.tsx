'use client';

import { Search } from 'lucide-react';
import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight command/combobox primitives — NOT cmdk-based. We expose enough
 * markup pieces (Container/Input/List/Item/Empty) for a custom multi-select
 * combobox to share consistent styling.
 */

export const Command = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
        className,
      )}
      {...props}
    />
  ),
);
Command.displayName = 'Command';

export const CommandInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = 'CommandInput';

export const CommandList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden p-1', className)}
      {...props}
    />
  ),
);
CommandList.displayName = 'CommandList';

export const CommandEmpty = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  ),
);
CommandEmpty.displayName = 'CommandEmpty';

export const CommandGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-hidden p-1 text-foreground', className)}
      {...props}
    />
  ),
);
CommandGroup.displayName = 'CommandGroup';

export interface CommandItemProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  disabled?: boolean;
}

export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, selected, disabled, ...props }, ref) => (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      data-disabled={disabled || undefined}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
CommandItem.displayName = 'CommandItem';
