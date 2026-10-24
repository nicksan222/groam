import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';
import { ResearchList } from './research-list';

const research = (partial: Partial<ResearchSummary>): ResearchSummary => ({
  brief: 'Compare central hotels',
  id: 'r-1',
  lastMessage: { authorName: 'Ada', text: 'Found a cheap one' },
  linkCount: 2,
  participantCount: 3,
  shortId: 'r1',
  title: 'Hotels in Rome',
  unread: true,
  updatedAt: 1,
  ...partial
});

test('shows a labeled loading state', async () => {
  await render(<ResearchList isLoading onCreate={vi.fn()} onOpen={vi.fn()} researches={[]} />);
  await expect.element(page.getByRole('status', { name: 'Loading researches…' })).toBeVisible();
});

test('shows the empty state and starts a research', async () => {
  const onCreate = vi.fn();
  await render(<ResearchList onCreate={onCreate} onOpen={vi.fn()} researches={[]} />);
  await expect
    .element(page.getByText('Start a research: dump links and notes about one subject'))
    .toBeVisible();
  await page.getByRole('button', { name: 'Start a research' }).click();
  expect(onCreate).toHaveBeenCalledOnce();
});

test('renders consistent research records with context and opens one', async () => {
  const onOpen = vi.fn();
  const items = [
    research({}),
    research({ brief: null, id: 'r-2', lastMessage: null, title: 'Museums', unread: false })
  ];
  await render(<ResearchList onCreate={vi.fn()} onOpen={onOpen} researches={items} />);
  await expect.element(page.getByRole('list', { name: /^Unread/ })).toBeVisible();
  await expect.element(page.getByRole('table')).not.toBeInTheDocument();
  await expect.element(page.getByLabelText('2 links').first()).toBeVisible();
  expect(page.getByTestId(testIds.researchCard).elements()).toHaveLength(2);
  await expect.element(page.getByText('Compare central hotels')).toBeVisible();
  await expect
    .element(page.getByTitle('Found a cheap one'))
    .toHaveTextContent('Ada: Found a cheap one');
  await expect.element(page.getByText('No brief')).toBeVisible();
  expect(document.querySelectorAll('[data-unread]')).toHaveLength(1);
  await page.getByText('Museums').click();
  expect(onOpen).toHaveBeenCalledWith(items[1]);
});

test('keeps filtering and sorting together in the bottom bar', async () => {
  await render(<ResearchList onOpen={vi.fn()} researches={[research({})]} />);
  const filter = page.getByRole('button', { name: 'Filter', exact: true });
  const sort = page.getByRole('button', { name: 'Sort threads' });
  const records = page.getByRole('list', { name: /^Unread/ });
  await expect.element(filter).toBeVisible();
  await expect.element(sort).toBeVisible();
  const footer = filter.element().closest('[data-slot="list-footer"]');
  expect(footer?.contains(sort.element())).toBe(true);
  expect(
    (records.element().compareDocumentPosition(footer!) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  const controls = document.querySelector('[data-slot="list-controls"]');
  expect(footer?.contains(controls)).toBe(true);
  await filter.click();
  await expect.element(page.getByRole('dialog', { name: 'Filter threads' })).toBeVisible();
});

test('filters rows by title or brief', async () => {
  const items = [research({}), research({ brief: null, id: 'r-2', title: 'Museums' })];
  await render(<ResearchList onCreate={vi.fn()} onOpen={vi.fn()} researches={items} />);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('combobox').fill('central');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => page.getByTestId(testIds.researchCard).elements().length).toBe(1);
  await expect.element(page.getByText('Museums')).not.toBeInTheDocument();
});

test('hides the start action without onCreate', async () => {
  await render(<ResearchList onOpen={vi.fn()} researches={[]} />);
  await expect.element(page.getByText('No research yet')).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Start a research' }))
    .not.toBeInTheDocument();
});

test('keeps phone records equal in height with long content', async () => {
  await useViewport(390, 844);
  const items = [
    research({ title: 'A very long research title '.repeat(5) }),
    research({ id: 'r-2', brief: null, lastMessage: null, unread: false })
  ];
  await render(
    <div className="px-4">
      <ResearchList onOpen={vi.fn()} researches={items} />
    </div>
  );
  await expect.element(page.getByTestId(testIds.researchCard).first()).toBeVisible();
  const rows = page.getByTestId(testIds.researchCard).elements();
  const preview = rows[0]?.querySelector('[data-slot="list-description"]');
  expect(preview?.getBoundingClientRect().width).toBeGreaterThan(150);
  expect(rows[0]?.getBoundingClientRect().height).toBeLessThan(120);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
});

test('sorts titles and clears a search with no matches', async () => {
  const items = [research({ title: 'Zoo' }), research({ id: 'r-2', title: 'Aquarium' })];
  await render(<ResearchList onOpen={vi.fn()} researches={items} />);
  await page.getByLabelText('Sort threads').click();
  await page.getByRole('radio', { name: 'Title A–Z' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Sort threads' })).not.toBeInTheDocument();
  expect(
    page.getByTestId(testIds.researchCard).elements()[0]?.getAttribute('data-research-id')
  ).toBe('r-2');
  await userEvent.keyboard('k');
  await page.getByRole('combobox').fill('no matches');
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByText('No matches for “no matches”')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect.element(page.getByRole('button', { name: 'Zoo' })).toBeVisible();
});

test('opens the filter dialog from the mobile shell action', async () => {
  await useViewport(390, 844);
  await render(<ResearchList onOpen={vi.fn()} researches={[research({})]} />);
  useTripCreateRequestStore.getState().request('search');
  await expect.element(page.getByRole('dialog', { name: 'Filter threads' })).toBeVisible();
});

test('combines research facets with text and reports matching counts', async () => {
  const items = [
    research({}),
    research({ id: 'r-2', unread: false }),
    research({ id: 'r-3', linkCount: 0 }),
    research({ id: 'r-4', title: 'Museums', brief: null })
  ];
  await render(<ResearchList onOpen={vi.fn()} researches={items} />);
  await userEvent.keyboard('k');
  await page.getByRole('combobox').fill('is:unread has:links Hotels');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => page.getByTestId(testIds.researchCard).elements().length).toBe(1);
  await expect.element(page.getByText('1 of 4 threads')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect.poll(() => page.getByTestId(testIds.researchCard).elements().length).toBe(4);
});

test('opens the sort dialog from a mobile shell request with the footer hidden', async () => {
  await useViewport(390, 844);
  await render(
    <ResearchList
      onOpen={vi.fn()}
      researches={[research({ title: 'Zoo' }), research({ id: 'r-2', title: 'Aquarium' })]}
    />
  );
  expect(getComputedStyle(document.querySelector('[data-slot="list-footer"]')!).display).toBe(
    'none'
  );
  useTripCreateRequestStore.getState().request('sort');
  await expect.element(page.getByRole('dialog', { name: 'Sort threads' })).toBeVisible();
  await page.getByRole('radio', { name: 'Title A–Z' }).click();
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  expect(
    page.getByTestId(testIds.researchCard).elements()[0]?.getAttribute('data-research-id')
  ).toBe('r-2');
});
