import { RecordListToolbar } from '@groam/ui/components/record-list-toolbar';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@groam/ui/components/select';
import type { DataTableResourceLabel } from '@groam/ui/lib/data-table';
import type { RecordListSort } from '@groam/ui/lib/record-list';
import { ArrowDownWideNarrow } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

/** A content-first alternative to a table, with shared filtering chrome and local sorting. */
export function RecordList<T>({
  empty,
  filterPlaceholder,
  filterTestId,
  getKey,
  hasExtraFilters = false,
  items,
  onClear,
  onQueryChange,
  query,
  renderItem,
  resourceLabel,
  sortOptions = [],
  toolbarExtra
}: {
  empty: ReactNode;
  filterPlaceholder?: string;
  filterTestId?: string;
  getKey: (item: T) => string;
  hasExtraFilters?: boolean;
  items: readonly T[];
  onClear?: () => void;
  onQueryChange: (query: string) => void;
  query: string;
  renderItem: (item: T) => ReactNode;
  resourceLabel: DataTableResourceLabel;
  sortOptions?: readonly RecordListSort<T>[];
  toolbarExtra?: ReactNode;
}) {
  const [sort, setSort] = useState(sortOptions[0]?.value ?? '');
  const selectedSort = sortOptions.find((option) => option.value === sort) ?? sortOptions[0];
  const orderedItems = useMemo(
    () => (selectedSort?.compare ? [...items].sort(selectedSort.compare) : items),
    [items, selectedSort]
  );
  const listLabel = resourceLabel.plural.charAt(0).toUpperCase() + resourceLabel.plural.slice(1);

  return (
    <div className="min-w-0 space-y-3" data-slot="record-list">
      <RecordListToolbar
        filterPlaceholder={filterPlaceholder}
        filterTestId={filterTestId}
        hasExtraFilters={hasExtraFilters}
        onClear={onClear}
        onQueryChange={onQueryChange}
        query={query}
        resourceLabel={resourceLabel}
        toolbarExtra={toolbarExtra}
      />
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/60 max-md:border-x-0 max-md:rounded-none bg-transparent text-foreground">
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-transparent px-4 py-1 md:bg-background/30 md:py-2 md:px-5">
          <span className="text-xs font-medium text-muted-foreground">
            {items.length} {items.length === 1 ? resourceLabel.singular : resourceLabel.plural}
          </span>
          {selectedSort ? (
            <Select onValueChange={setSort} value={selectedSort.value}>
              <SelectTrigger
                aria-label={`Sort ${resourceLabel.plural}`}
                className="h-7 w-auto gap-1.5 border-transparent bg-transparent text-xs dark:bg-transparent text-muted-foreground shadow-none"
                size="sm"
              >
                <ArrowDownWideNarrow aria-hidden className="size-3.5" />
                <span>{selectedSort.label}</span>
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        {orderedItems.length ? (
          <ul aria-label={listLabel} className="divide-y divide-border/40">
            {orderedItems.map((item) => (
              <li className="min-w-0" key={getKey(item)}>
                {renderItem(item)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground" role="status">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}
