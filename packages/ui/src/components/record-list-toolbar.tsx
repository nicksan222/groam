import { X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { SearchInput } from '@groam/ui/components/search-input';
import {
  dataTableFilterLabels,
  dataTableSearchInputClassName,
  dataTableToolbarClassName,
  type DataTableResourceLabel
} from '@groam/ui/lib/data-table';
import type { ReactNode } from 'react';

export function RecordListToolbar({
  filterPlaceholder,
  filterTestId,
  hasExtraFilters,
  onClear,
  onQueryChange,
  query,
  resourceLabel,
  toolbarExtra
}: {
  filterPlaceholder?: string;
  filterTestId?: string;
  hasExtraFilters: boolean;
  onClear?: () => void;
  onQueryChange: (query: string) => void;
  query: string;
  resourceLabel: DataTableResourceLabel;
  toolbarExtra?: ReactNode;
}) {
  const labels = dataTableFilterLabels(resourceLabel);
  return (
    <section aria-label={labels.toolbarAriaLabel} className={dataTableToolbarClassName}>
      <SearchInput
        aria-label={labels.filterAriaLabel}
        className={dataTableSearchInputClassName}
        data-testid={filterTestId}
        inputClassName="max-md:h-11 max-md:text-base"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={filterPlaceholder ?? labels.filterPlaceholder}
        value={query}
      />
      {toolbarExtra}
      {query.trim() || hasExtraFilters ? (
        <Button
          aria-label={labels.clearAriaLabel}
          onClick={() => {
            onQueryChange('');
            onClear?.();
          }}
          size="sm"
          variant="ghost"
        >
          Clear
          <X aria-hidden />
        </Button>
      ) : null}
    </section>
  );
}
