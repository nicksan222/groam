import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DataTable } from './data-table';

afterEach(cleanup);

test('keeps a min-width repository list inside a bordered horizontal scroll panel', () => {
  const { container } = render(
    <DataTable
      columns={[
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'city', header: 'City' }
      ]}
      data={[{ city: 'Lisbon', name: 'Alex' }]}
      filterPlaceholder="Filter people…"
    />
  );

  const chrome = container.querySelector('[data-slot="data-table"]');
  const table = container.querySelector('[data-slot="table"]');
  const tableContainer = container.querySelector('[data-slot="table-container"]');
  const toolbar = container.querySelector('[data-slot="data-table-toolbar"]');

  expect(chrome?.className).toContain('overflow-x-auto');
  expect(chrome?.className).toContain('min-h-min');
  expect(chrome?.className).toContain('min-w-0');
  expect(chrome?.className).toContain('w-full');
  expect(chrome?.className).toContain('bg-card');
  expect(chrome?.className).toContain('border-border');
  expect(chrome?.className).toContain('rounded-lg');
  expect(chrome?.className).not.toContain('bg-muted');
  expect(chrome?.className).not.toContain('rounded-2xl');
  expect(chrome?.className).not.toContain('overflow-y-clip');
  expect(container.querySelector('[data-slot="table-header"]')?.className).toContain('bg-muted/40');
  expect(tableContainer?.getAttribute('data-variant')).toBe('list');
  expect(tableContainer?.className).toContain('overflow-x-visible');
  expect(tableContainer?.className).toContain('w-full');
  expect(tableContainer?.className).not.toContain('w-max');
  expect(tableContainer?.className).not.toContain('overflow-x-auto');
  expect(table?.className).toContain('min-w-[max(40rem,max-content)]');
  expect(table?.className).toContain('w-full');
  expect(table?.className).not.toContain('w-max');
  expect(table?.className).toContain('table-fixed');
  expect(table?.className).not.toContain('pr-3');
  expect(toolbar?.className).toContain('flex-wrap');
  expect(toolbar?.className).not.toContain('bg-card');
  expect(toolbar?.className).not.toContain('border-border');
  expect(toolbar?.className).not.toContain('rounded-lg');
});

test('derives filter labels from resourceLabel', () => {
  render(
    <DataTable
      columns={[{ accessorKey: 'name', header: 'Name' }]}
      data={[{ name: 'Alex' }]}
      resourceLabel={{ plural: 'issues', singular: 'issue' }}
    />
  );

  expect(screen.getByRole('searchbox', { name: 'Search issues' })).toBeTruthy();
  expect(screen.getByPlaceholderText('Search issues…')).toBeTruthy();
});

test('filters rows and shows an empty state when nothing matches', () => {
  render(
    <DataTable
      columns={[
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'city', header: 'City' }
      ]}
      data={[
        { city: 'Lisbon', name: 'Alex' },
        { city: 'Kyoto', name: 'Lea' }
      ]}
      empty="No matching people."
      filterPlaceholder="Filter people…"
    />
  );

  expect(screen.getByText('Alex')).toBeTruthy();
  expect(screen.getByText('Lea')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Filter people…' }), {
    target: { value: 'kyo' }
  });
  expect(screen.queryByText('Alex')).toBeNull();
  expect(screen.getByText('Lea')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Filter people…' }), {
    target: { value: 'zzz' }
  });
  expect(screen.getByText('No matching people.')).toBeTruthy();
});

test('externalFilter keeps rows visible while query changes', () => {
  render(
    <DataTable
      columns={[{ accessorKey: 'name', header: 'Name' }]}
      data={[{ name: 'Alex' }]}
      externalFilter
      filterValue="zzz"
      resourceLabel={{ plural: 'issues', singular: 'issue' }}
    />
  );

  expect(screen.getByText('Alex')).toBeTruthy();
});

test('applies full-bleed cellClassName to body cells without stripping header padding', () => {
  const { container } = render(
    <DataTable
      columns={[
        {
          accessorKey: 'name',
          header: 'Name',
          meta: { cellClassName: 'overflow-hidden p-0!', className: 'whitespace-normal' }
        }
      ]}
      data={[{ name: 'Alex' }]}
    />
  );

  const head = container.querySelector('[data-slot="table-head"]');
  const cell = container.querySelector('[data-slot="table-cell"]');
  expect(head?.className).toContain('px-2.5');
  expect(head?.className).not.toContain('p-0!');
  expect(cell?.className).toContain('overflow-hidden p-0!');
});
