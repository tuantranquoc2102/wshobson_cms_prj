'use client';

import { Fragment, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: ReactNode;
  /** Render a cell. Default: renders `row[key]` if it's a primitive. */
  cell?: (row: T) => ReactNode;
  /** Allow header-click sorting. Caller owns the sort state. */
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
};

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  onRowClick,
  sort,
  onSortChange,
}: DataTableProps<T>) {
  function handleSort(key: string) {
    if (!onSortChange) return;
    if (!sort || sort.key !== key) {
      onSortChange({ key, dir: 'asc' });
    } else if (sort.dir === 'asc') {
      onSortChange({ key, dir: 'desc' });
    } else {
      onSortChange(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const Icon = !active
                ? ArrowUpDown
                : sort?.dir === 'asc'
                  ? ArrowUp
                  : ArrowDown;
              return (
                <TableHead key={c.key} className={c.headerClassName}>
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>{c.header}</span>
                      <Icon className="h-3 w-3 opacity-60" />
                    </button>
                  ) : (
                    <span>{c.header}</span>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <Fragment key={rowKey(row)}>
              <TableRow
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.cell
                      ? c.cell(row)
                      : ((): ReactNode => {
                          const v = (row as Record<string, unknown>)[c.key];
                          if (v == null) return '';
                          if (typeof v === 'string' || typeof v === 'number')
                            return v;
                          return null;
                        })()}
                  </TableCell>
                ))}
              </TableRow>
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
