import { ArrowDown, ArrowUp, ArrowUpDown } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { dataTableSortHeaderClassName } from '@groam/ui/lib/data-table';
import type { Column } from '@tanstack/table-core';

/** Uses the table's ascending, descending, and original-order sorting cycle. */
export function DataTableSortHeader<T>({
  column,
  label
}: {
  column: Column<T, unknown>;
  label: string;
}) {
  const direction = column.getIsSorted();
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <Button
      aria-label={`Sort by ${label.toLowerCase()}`}
      className={dataTableSortHeaderClassName}
      onClick={column.getToggleSortingHandler()}
      size="sm"
      variant="ghost"
    >
      {label}
      <Icon aria-hidden className="size-3.5 text-muted-foreground" />
    </Button>
  );
}
