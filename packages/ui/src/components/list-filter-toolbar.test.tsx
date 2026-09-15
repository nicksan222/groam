import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ListFilterSection, ListFilterToolbar } from './list-filter-toolbar';

afterEach(cleanup);

const statusOptions = [
  { label: 'Open', value: 'open' },
  { label: 'All', value: 'all' }
] as const;

function renderToolbar({
  hasFilters = false,
  query = '',
  status = 'open'
}: {
  hasFilters?: boolean;
  query?: string;
  status?: 'all' | 'open';
} = {}) {
  const onClear = vi.fn();
  const onQueryChange = vi.fn();
  const onStatusChange = vi.fn();

  render(
    <ListFilterToolbar
      ariaLabel="Filter issues"
      clearAriaLabel="Clear issue filters"
      hasFilters={hasFilters}
      noun="issues"
      onClear={onClear}
      onQueryChange={onQueryChange}
      onStatusChange={onStatusChange}
      query={query}
      resultCount={2}
      searchAriaLabel="Search issues"
      searchPlaceholder="Search issues…"
      status={status}
      statusAriaLabel="Filter issues by status"
      statusOptions={[...statusOptions]}
      totalCount={5}
    />
  );

  return { onClear, onQueryChange, onStatusChange };
}

test('renders a compact search field and the selected status', () => {
  renderToolbar();

  const toolbar = screen.getByRole('region', { name: 'Filter issues' });
  expect(toolbar.getAttribute('data-slot')).toBe('list-filter-toolbar');
  expect(toolbar.className).toContain('flex-wrap');
  expect(toolbar.className).toContain('gap-2');
  const searchInput = screen
    .getByRole('searchbox', { name: 'Search issues' })
    .closest('[data-slot="search-input"]');
  expect(searchInput?.className).toContain('sm:max-w-56');
  expect(screen.getByLabelText('Filter issues by status').textContent).toContain('Open');
  expect(screen.queryByRole('button', { name: 'Clear issue filters' })).toBeNull();
});

test('wraps toolbar and content with data-table list spacing', () => {
  render(
    <ListFilterSection>
      <ListFilterToolbar
        ariaLabel="Filter issues"
        clearAriaLabel="Clear issue filters"
        hasFilters={false}
        noun="issues"
        onClear={vi.fn()}
        onQueryChange={vi.fn()}
        onStatusChange={vi.fn()}
        query=""
        resultCount={0}
        searchAriaLabel="Search issues"
        searchPlaceholder="Search issues…"
        status="open"
        statusAriaLabel="Filter issues by status"
        statusOptions={[...statusOptions]}
        totalCount={0}
      />
      <p>Results</p>
    </ListFilterSection>
  );

  const section = screen.getByText('Results').parentElement;
  expect(section?.getAttribute('data-slot')).toBe('list-filter-section');
  expect(section?.className).toContain('space-y-2.5');
});

test('forwards search changes and shows a clear action when filters are active', () => {
  const { onClear, onQueryChange } = renderToolbar({ hasFilters: true, query: 'coast' });

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search issues' }), {
    target: { value: 'lisbon' }
  });
  expect(onQueryChange).toHaveBeenCalledWith('lisbon');

  fireEvent.click(screen.getByRole('button', { name: 'Clear issue filters' }));
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Showing 2 of 5 issues')).toBeTruthy();
});
