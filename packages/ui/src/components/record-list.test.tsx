import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { RecordList } from './record-list';
import { RecordListItem } from './record-list-item';

const items = [
  { id: 'b', title: 'Beach day' },
  { id: 'a', title: 'Art museum' }
];

test('renders semantic records with separate titles, context and actions', async () => {
  await render(
    <RecordList
      empty="No records"
      getKey={(item) => item.id}
      items={items}
      onQueryChange={vi.fn()}
      query=""
      resourceLabel={{ singular: 'record', plural: 'records' }}
      renderItem={(item) => (
        <RecordListItem
          title={<a href={`#${item.id}`}>{item.title}</a>}
          metadata="Trip context"
          badges="Closing condition"
          trailing={<span>Yesterday</span>}
        />
      )}
    />
  );
  await expect.element(page.getByRole('list', { name: 'Records' })).toBeInTheDocument();
  expect(page.getByRole('listitem').elements()).toHaveLength(2);
  await expect.element(page.getByRole('link', { name: 'Beach day' })).toBeVisible();
  expect(page.getByText('Trip context').elements()).toHaveLength(2);
});

test('sorts a copy of the supplied records and preserves default order', async () => {
  await render(
    <RecordList
      empty="No records"
      getKey={(item) => item.id}
      items={items}
      onQueryChange={vi.fn()}
      query=""
      resourceLabel={{ singular: 'record', plural: 'records' }}
      sortOptions={[
        { value: 'default', label: 'Default order' },
        { value: 'title', label: 'Title A–Z', compare: (a, b) => a.title.localeCompare(b.title) }
      ]}
      renderItem={(item) => <RecordListItem title={item.title} />}
    />
  );
  await page.getByRole('combobox', { name: 'Sort records' }).click();
  await page.getByRole('option', { name: 'Title A–Z' }).click();
  expect(
    page
      .getByRole('listitem')
      .elements()
      .map((item) => item.textContent)
  ).toEqual(['Art museum', 'Beach day']);
  expect(items[0]?.title).toBe('Beach day');
});

test('announces empty results and clears the query', async () => {
  const onClear = vi.fn();
  function Example() {
    const [query, setQuery] = useState('missing');
    return (
      <RecordList
        empty="No matching records."
        getKey={(item: (typeof items)[number]) => item.id}
        items={[]}
        onClear={onClear}
        onQueryChange={setQuery}
        query={query}
        resourceLabel={{ singular: 'record', plural: 'records' }}
        renderItem={(item) => <RecordListItem title={item.title} />}
      />
    );
  }
  await render(<Example />);
  await expect.element(page.getByRole('status')).toHaveTextContent('No matching records.');
  await page.getByRole('button', { name: 'Clear record filters' }).click();
  await expect.element(page.getByRole('searchbox', { name: 'Search records' })).toHaveValue('');
  expect(onClear).toHaveBeenCalledOnce();
});

test('keeps long titles and optional badges on the same two-line rhythm', async () => {
  await render(
    <RecordList
      empty="No records"
      getKey={(item) => item.id}
      items={items}
      onQueryChange={vi.fn()}
      query=""
      resourceLabel={{ singular: 'record', plural: 'records' }}
      renderItem={(item) => (
        <RecordListItem
          title={item.id === 'b' ? 'A very long trip decision '.repeat(15) : item.title}
          metadata="Trip context"
          badges={item.id === 'b' ? <span>Mandatory</span> : undefined}
        />
      )}
    />
  );
  const records = document.querySelectorAll('[data-slot="record-list-item"]');
  expect(records[0]?.getBoundingClientRect().height).toBe(
    records[1]?.getBoundingClientRect().height
  );
  expect(
    records[0]?.querySelector('[data-slot="record-list-title"]')?.getBoundingClientRect().height
  ).toBe(24);
});
