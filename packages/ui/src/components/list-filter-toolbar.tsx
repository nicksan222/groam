import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { SearchInput } from '@groam/ui/components/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@groam/ui/components/select';
import {
  dataTableRootClassName,
  dataTableSearchInputClassName,
  dataTableToolbarClassName,
  listFilterCountBadgeClassName,
  listFilterTriggerClassName
} from '@groam/ui/lib/data-table';
import { cn } from '@groam/ui/lib/utils';
import { CirclePlus, X } from 'lucide-react';
import type { ReactNode } from 'react';

export type ListFilterOption<Status extends string> = {
  label: string;
  value: Status;
};

export type ListFilterToolbarProps<Status extends string> = {
  ariaLabel: string;
  clearAriaLabel: string;
  hasFilters: boolean;
  noun: string;
  onClear: () => void;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: Status) => void;
  query: string;
  resultCount: number;
  searchAriaLabel: string;
  searchPlaceholder: string;
  status: Status;
  statusAriaLabel: string;
  statusOptionTestId?: string;
  statusOptions: Array<ListFilterOption<Status>>;
  statusTestId?: string;
  totalCount: number;
};

function ListFilterToolbar<Status extends string>({
  ariaLabel,
  clearAriaLabel,
  hasFilters,
  noun,
  onClear,
  onQueryChange,
  onStatusChange,
  query,
  resultCount,
  searchAriaLabel,
  searchPlaceholder,
  status,
  statusAriaLabel,
  statusOptionTestId,
  statusOptions,
  statusTestId,
  totalCount
}: ListFilterToolbarProps<Status>) {
  const selected = statusOptions.find((option) => option.value === status)?.label ?? status;

  return (
    <section
      aria-label={ariaLabel}
      className={dataTableToolbarClassName}
      data-slot="list-filter-toolbar"
    >
      <SearchInput
        aria-label={searchAriaLabel}
        className={dataTableSearchInputClassName}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={searchPlaceholder}
        value={query}
      />
      <Select onValueChange={(value) => onStatusChange(value as Status)} value={status}>
        <SelectTrigger
          aria-label={statusAriaLabel}
          className={listFilterTriggerClassName}
          data-has-value={hasFilters || undefined}
          data-testid={statusTestId}
          size="sm"
        >
          <CirclePlus className="size-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
          <span className="truncate">{selected}</span>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem
              data-status={option.value}
              data-testid={statusOptionTestId}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters ? (
        <>
          <Badge className={listFilterCountBadgeClassName} variant="secondary">
            {resultCount}
            <span className="text-muted-foreground">/{totalCount}</span>
          </Badge>
          <Button
            aria-label={clearAriaLabel}
            className="shadow-none"
            onClick={onClear}
            size="sm"
            type="button"
            variant="ghost"
          >
            Reset
            <X />
          </Button>
          <p className="sr-only">
            Showing {resultCount} of {totalCount} {noun}
          </p>
        </>
      ) : null}
    </section>
  );
}

/** Groups a list filter toolbar with the content below it (same rhythm as `DataTable`). */
function ListFilterSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(dataTableRootClassName, className)} data-slot="list-filter-section">
      {children}
    </div>
  );
}

export { ListFilterSection, ListFilterToolbar };
