'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type Updater,
  type HeaderGroup,
  type Header,
  type Row,
  type Cell,
  flexRender,
} from '@tanstack/react-table';

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  sorting = [],
  onSortingChange,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(sorting);
  const sortState = onSortingChange ? sorting : internalSorting;
  const setSortState = onSortingChange ?? setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    state: { sorting: sortState },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === 'function' ? updater(sortState) : sortState;
      setSortState(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={`overflow-auto rounded-lg border ${className}`} style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--muted)' }}>
          {table.getHeaderGroups().map((hg: HeaderGroup<T>) => (
            <tr key={hg.id}>
              {hg.headers.map((h: Header<T, unknown>) => (
                <th
                  key={h.id}
                  className="text-left font-medium px-4 py-3 whitespace-nowrap"
                  style={{ color: 'var(--foreground)' }}
                >
                  <div
                    className={h.column.getCanSort() ? 'cursor-pointer select-none flex items-center gap-1' : ''}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext()) as React.ReactNode}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[h.column.getIsSorted() as string] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row: Row<T>) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={onRowClick ? 'cursor-pointer hover:opacity-90' : ''}
              style={{
                background: 'var(--card)',
                color: 'var(--card-foreground)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {row.getVisibleCells().map((cell: Cell<T, unknown>) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext()) as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
