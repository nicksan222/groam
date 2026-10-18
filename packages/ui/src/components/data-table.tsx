import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { SearchInput } from '@groam/ui/components/search-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@groam/ui/components/table';
import {
  type DataTableFilterLabelOptions,
  type DataTableResourceLabel,
  dataTableChromeClassName,
  dataTableFilterLabels,
  dataTableHeaderClassName,
  dataTableHeaderRowClassName,
  dataTablePassThroughFilterFn,
  dataTableRootClassName,
  dataTableSearchInputClassName,
  dataTableTableClassName,
  dataTableTableContainerClassName,
  dataTableToolbarClassName,
  listFilterOutlineButtonClassName
} from '@groam/ui/lib/data-table';
import { cn } from '@groam/ui/lib/utils';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import type {
  Column,
  ColumnDef,
  FilterFn,
  Row,
  SortingState,
  VisibilityState
} from '@tanstack/table-core';
import { Settings2, X } from 'lucide-react';
import { type HTMLAttributes, type ReactNode, useState } from 'react';

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData, TValue> {
    cellClassName?: string;
    className?: string;
    label?: string;
  }
}

export type { ColumnDef, DataTableResourceLabel, FilterFn };

export function DataTable<TData, TValue>({
  clearAriaLabel,
  columns,
  data,
  empty,
  externalFilter = false,
  filterAriaLabel,
  filterPlaceholder,
  filterPlaceholderPrefix,
  filterTestId,
  filterValue,
  getRowId,
  getRowProps,
  globalFilterFn,
  hasExtraFilters = false,
  onClear,
  onFilterValueChange,
  onRowActivate,
  resourceLabel,
  rowClassName,
  rowTestId,
  testId,
  toolbarAriaLabel,
  toolbarExtra
}: {
  clearAriaLabel?: string;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  empty?: string;
  /** When true, row filtering is handled outside the table (e.g. status filters). */
  externalFilter?: boolean;
  filterAriaLabel?: string;
  filterPlaceholder?: string;
  filterPlaceholderPrefix?: DataTableFilterLabelOptions['filterPlaceholderPrefix'];
  filterTestId?: string;
  filterValue?: string;
  getRowId?: (row: TData) => string;
  getRowProps?: (
    row: TData
  ) => HTMLAttributes<HTMLTableRowElement> &
    Record<`data-${string}`, string | boolean | number | undefined>;
  globalFilterFn?: FilterFn<TData>;
  hasExtraFilters?: boolean;
  onClear?: () => void;
  onFilterValueChange?: (value: string) => void;
  onRowActivate?: (row: TData) => void;
  resourceLabel?: DataTableResourceLabel;
  rowClassName?: (row: TData) => string | undefined;
  rowTestId?: string | ((row: TData) => string);
  testId?: string;
  toolbarAriaLabel?: string;
  toolbarExtra?: ReactNode;
}) {
  const resourceDefaults = resourceLabel
    ? dataTableFilterLabels(resourceLabel, { filterPlaceholderPrefix })
    : undefined;
  const resolvedEmpty = empty ?? resourceDefaults?.empty ?? 'No results.';
  const resolvedClearAriaLabel =
    clearAriaLabel ?? resourceDefaults?.clearAriaLabel ?? 'Clear filters';
  const resolvedFilterPlaceholder =
    filterPlaceholder ?? resourceDefaults?.filterPlaceholder ?? 'Filter…';
  const resolvedFilterAriaLabel =
    filterAriaLabel ?? resourceDefaults?.filterAriaLabel ?? resolvedFilterPlaceholder;
  const resolvedToolbarAriaLabel = toolbarAriaLabel ?? resourceDefaults?.toolbarAriaLabel;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [uncontrolledFilter, setUncontrolledFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const globalFilter = filterValue ?? uncontrolledFilter;
  const setGlobalFilter = onFilterValueChange ?? setUncontrolledFilter;
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId,
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn:
      globalFilterFn ??
      (externalFilter
        ? (dataTablePassThroughFilterFn as FilterFn<TData>)
        : (row, _columnId, nextFilter) => {
            const query = String(nextFilter).trim().toLowerCase();
            if (!query) return true;
            return row.getAllCells().some((cell) =>
              String(cell.getValue() ?? '')
                .toLowerCase()
                .includes(query)
            );
          }),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    state: { columnVisibility, globalFilter, sorting }
  });
  const hideable = table.getAllColumns().filter((column) => column.getCanHide());
  const hasFilters = globalFilter.trim() !== '' || hasExtraFilters;

  return (
    <div className={dataTableRootClassName}>
      <section
        aria-label={resolvedToolbarAriaLabel}
        className={dataTableToolbarClassName}
        data-slot="data-table-toolbar"
      >
        <SearchInput
          aria-label={resolvedFilterAriaLabel}
          className={dataTableSearchInputClassName}
          data-testid={filterTestId}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder={resolvedFilterPlaceholder}
          value={globalFilter}
        />
        {toolbarExtra}
        {hasFilters ? (
          <Button
            aria-label={resolvedClearAriaLabel}
            onClick={() => {
              setGlobalFilter('');
              onClear?.();
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Reset
            <X />
          </Button>
        ) : null}
        {hideable.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Toggle columns"
                className={cn('ml-auto', listFilterOutlineButtonClassName)}
                size="sm"
                variant="outline"
              >
                <Settings2 className="size-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
                <span className="sr-only sm:not-sr-only">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {hideable.map((column) => (
                  <DropdownMenuCheckboxItem
                    checked={column.getIsVisible()}
                    className="capitalize"
                    key={column.id}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {columnLabel(column)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </section>
      <div className={dataTableChromeClassName} data-slot="data-table" data-testid={testId}>
        <Table
          className={dataTableTableClassName}
          containerClassName={dataTableTableContainerClassName}
          variant="list"
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow className={dataTableHeaderRowClassName} key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    className={cn(
                      dataTableHeaderClassName,
                      header.column.columnDef.meta?.className
                    )}
                    key={header.id}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table
                .getRowModel()
                .rows.map((row) => (
                  <DataTableRow
                    getRowProps={getRowProps}
                    key={row.id}
                    onRowActivate={onRowActivate}
                    row={row}
                    rowClassName={rowClassName}
                    rowTestId={rowTestId}
                  />
                ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {resolvedEmpty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type DataTableRowProps<TData> = {
  getRowProps?: (
    row: TData
  ) => HTMLAttributes<HTMLTableRowElement> &
    Record<`data-${string}`, string | boolean | number | undefined>;
  onRowActivate?: (row: TData) => void;
  row: Row<TData>;
  rowClassName?: (row: TData) => string | undefined;
  rowTestId?: string | ((row: TData) => string);
};

function DataTableRow<TData>({
  getRowProps,
  onRowActivate,
  row,
  rowClassName,
  rowTestId
}: DataTableRowProps<TData>) {
  const extra = getRowProps?.(row.original) ?? {};
  const activate = () => onRowActivate?.(row.original);
  return (
    <TableRow
      {...extra}
      className={cn(
        extra.className,
        onRowActivate ? 'cursor-pointer' : undefined,
        rowClassName?.(row.original)
      )}
      data-testid={
        extra['data-testid'] ??
        (typeof rowTestId === 'function' ? rowTestId(row.original) : rowTestId)
      }
      onClick={
        onRowActivate
          ? (event) => {
              extra.onClick?.(event);
              if (event.defaultPrevented) return;
              if ((event.target as HTMLElement).closest('a, button, [role="menuitem"]')) return;
              activate();
            }
          : extra.onClick
      }
      onKeyDown={
        onRowActivate
          ? (event) => {
              extra.onKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activate();
              }
            }
          : extra.onKeyDown
      }
      tabIndex={onRowActivate ? 0 : extra.tabIndex}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          className={cn(
            'truncate',
            cell.column.columnDef.meta?.className,
            cell.column.columnDef.meta?.cellClassName
          )}
          key={cell.id}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

function columnLabel<TData, TValue>(column: Column<TData, TValue>): ReactNode {
  return (
    column.columnDef.meta?.label ??
    (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id)
  );
}
