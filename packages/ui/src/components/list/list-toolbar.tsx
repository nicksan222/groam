import { X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { SearchInput } from '@groam/ui/components/search-input';
import type { ReactNode } from 'react';
import {
  dataTableFilterLabels,
  dataTableSearchInputClassName,
  dataTableToolbarClassName,
  type DataTableResourceLabel
} from '#src/lib/data-table';

/**
 * Search plus whatever filter controls the list needs (`children`: a segmented control, selects,
 * chips). Clear shows while the search or `active` filters narrow the list.
 */
function ListToolbar({
  active = false,
  children,
  noun,
  onClear,
  onQueryChange,
  placeholder,
  query,
  testId
}: {
  /** Whether filters other than the search narrow the list, so Clear appears. */
  active?: boolean;
  children?: ReactNode;
  noun: DataTableResourceLabel;
  /** Called after the search is emptied, to reset the other filters. */
  onClear?: () => void;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  query: string;
  testId?: string;
}) {
  const labels = dataTableFilterLabels(noun);
  return (
    <section
      aria-label={labels.toolbarAriaLabel}
      className={dataTableToolbarClassName}
      data-slot="list-toolbar"
    >
      <SearchInput
        aria-label={labels.filterAriaLabel}
        className={dataTableSearchInputClassName}
        data-testid={testId}
        inputClassName="max-md:h-11 max-md:text-base"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder ?? labels.filterPlaceholder}
        value={query}
      />
      {children}
      {query.trim() || active ? (
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

export { ListToolbar };
