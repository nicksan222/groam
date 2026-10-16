import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ListFilterSection, ListFilterToolbar } from './list-filter-toolbar';

const statusOptions = [
  { label: 'Open', value: 'open' },
  { label: 'All', value: 'all' }
] as const;

async function renderToolbar({
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

  await render(
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

test('renders a compact search field and the selected status', async () => {
  await renderToolbar();

  const toolbar = page.getByRole('region', { name: 'Filter issues' }).element();
  expect(toolbar.getAttribute('data-slot')).toBe('list-filter-toolbar');
  expect(toolbar.className).toContain('flex-wrap');
  expect(toolbar.className).toContain('gap-2');
  const searchInput = page
    .getByRole('searchbox', { name: 'Search issues' })
    .element()
    .closest('[data-slot="search-input"]');
  expect(searchInput?.className).toContain('sm:max-w-56');
  expect(page.getByLabelText('Filter issues by status').element().textContent).toContain('Open');
  await expect
    .element(page.getByRole('button', { name: 'Clear issue filters' }))
    .not.toBeInTheDocument();
});

test('wraps toolbar and content with data-table list spacing', async () => {
  await render(
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

  const section = page.getByText('Results').element().parentElement;
  expect(section?.getAttribute('data-slot')).toBe('list-filter-section');
  expect(section?.className).toContain('space-y-2.5');
});

test('forwards search changes and shows a clear action when filters are active', async () => {
  const { onClear, onQueryChange } = await renderToolbar({ hasFilters: true, query: 'coast' });

  await page.getByRole('searchbox', { name: 'Search issues' }).fill('lisbon');
  expect(onQueryChange).toHaveBeenCalledWith('lisbon');

  await page.getByRole('button', { name: 'Clear issue filters' }).click();
  expect(onClear).toHaveBeenCalledTimes(1);
  await expect.element(page.getByText('Showing 2 of 5 issues')).toBeInTheDocument();
});
