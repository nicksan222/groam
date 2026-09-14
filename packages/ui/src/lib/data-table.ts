import type { FilterFn } from '@tanstack/table-core';

/** Shared DataTable / list-filter chrome tokens. */

/** Singular/plural resource name for standard filter aria labels and placeholders. */
export type DataTableResourceLabel = {
  plural: string;
  singular: string;
  /** Defaults to `Loading ${plural}…`. */
  loadingAriaLabel?: string;
};

export type DataTableFilterLabelOptions = {
  /** Prefix for the search field placeholder (default `Search`). */
  filterPlaceholderPrefix?: 'Filter' | 'Search';
};

/** Standard toolbar/search aria labels derived from a resource name. */
export function dataTableFilterLabels(
  resource: DataTableResourceLabel,
  options: DataTableFilterLabelOptions = {}
) {
  const prefix = options.filterPlaceholderPrefix ?? 'Search';
  return {
    clearAriaLabel: `Clear ${resource.singular} filters`,
    empty: `No matching ${resource.plural}.`,
    filterAriaLabel: `${prefix} ${resource.plural}`,
    filterPlaceholder: `${prefix} ${resource.plural}…`,
    loadingAriaLabel: resource.loadingAriaLabel ?? `Loading ${resource.plural}…`,
    toolbarAriaLabel: `Filter ${resource.plural}`
  } as const;
}

/** Keeps rows visible while query/status filters are applied outside the table. */
export const dataTablePassThroughFilterFn: FilterFn<unknown> = () => true;

/** Select trigger style for compact filters beside a search field (Halo dashed outline). */
export const listFilterTriggerClassName =
  'max-w-48 shrink-0 gap-1.5 border-dashed bg-background shadow-xs/5 hover:bg-accent/50 dark:hover:bg-muted data-[has-value=true]:border-solid data-[state=open]:border-solid';

/** Keeps fixed-layout columns from blowing out table width. */
export const dataTableColumnFillClassName = 'min-w-0 max-w-0';

/** Mono timestamp cells used across list tables. */
export const dataTableMetaTimeClassName = 'font-mono text-xs tabular-nums text-muted-foreground';

/** Ghost sort control used in sortable column headers. */
export const dataTableSortHeaderClassName = '-ml-2 h-8';

/** Root wrapper around toolbar + table chrome. */
export const dataTableRootClassName = 'w-full min-w-0 space-y-3';

/** Toolbar row above the table. */
export const dataTableToolbarClassName = 'flex min-w-0 flex-wrap items-center gap-2';

/** Search field width inside list filter toolbars. */
export const dataTableSearchInputClassName = 'w-full min-w-0 sm:max-w-56 lg:max-w-72';

/** Scroll host around Halo card tables (no outer border — card cells own chrome). */
export const dataTableChromeClassName =
  'w-full min-h-min min-w-0 overflow-x-auto overscroll-x-contain';

/**
 * Table wrapper inside DataTable chrome — chrome owns horizontal scroll so nested
 * `overflow-x-auto` does not swallow overflow at medium breakpoints.
 */
export const dataTableTableContainerClassName = 'w-full min-w-0 overflow-x-visible';

/** Table layout inside the chrome (Halo `table-fixed`). */
export const dataTableTableClassName = 'w-full min-w-[max(40rem,max-content)] table-fixed';

/** Default header cell typography. */
export const dataTableHeaderClassName = 'truncate text-xs font-medium text-muted-foreground';

/** Header row should not pick up body hover fill. */
export const dataTableHeaderRowClassName = 'hover:bg-transparent';

/** Active filter count chip beside clear. */
export const listFilterCountBadgeClassName = 'rounded-sm px-1.5 font-normal tabular-nums';

/** Outline companion controls in the toolbar (Columns, etc.). */
export const listFilterOutlineButtonClassName = 'shrink-0 border-dashed shadow-xs/5';

/** Skeleton for the status filter beside search in loading state. */
export const dataTableStatusFilterSkeletonClassName = 'h-8 w-36 shrink-0 rounded-lg';
