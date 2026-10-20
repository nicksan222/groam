import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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
  await expect.element(page.getByRole('list', { name: 'Research' })).toBeVisible();
  await expect.element(page.getByRole('table')).not.toBeInTheDocument();
  await expect.element(page.getByLabelText('3 people').first()).toBeVisible();
  await expect.element(page.getByLabelText('2 links').first()).toBeVisible();
  expect(page.getByTestId(testIds.researchCard).elements()).toHaveLength(2);
  await expect.element(page.getByText('Compare central hotels')).toBeVisible();
  await expect
    .element(page.getByTitle('Found a cheap one'))
    .toHaveTextContent('Ada: Found a cheap one');
  await expect.element(page.getByText('No brief')).toBeVisible();
  expect(page.getByTestId(testIds.researchUnread).elements()).toHaveLength(1);
  await page.getByText('Museums').click();
  expect(onOpen).toHaveBeenCalledWith(items[1]);
});

test('filters rows by title or brief', async () => {
  const items = [research({}), research({ brief: null, id: 'r-2', title: 'Museums' })];
  await render(<ResearchList onCreate={vi.fn()} onOpen={vi.fn()} researches={items} />);
  await page.getByRole('searchbox').fill('central');
  expect(page.getByTestId(testIds.researchCard).elements()).toHaveLength(1);
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
  await render(<ResearchList onOpen={vi.fn()} researches={items} />);
  await expect
    .element(page.getByTitle(new Date(items[0]!.updatedAt).toLocaleString()).first())
    .toBeVisible();
  const rows = page.getByTestId(testIds.researchCard).elements();
  const preview = rows[0]?.querySelector('[data-slot="record-list-description"]');
  expect(preview?.getBoundingClientRect().width).toBeGreaterThan(280);
  const footer = rows[0]?.querySelector('[data-slot="record-list-badges"]');
  expect(preview?.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    footer!.getBoundingClientRect().top
  );
  expect(rows[0]?.getBoundingClientRect().height).toBe(rows[1]?.getBoundingClientRect().height);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
});

test('sorts titles and clears a search with no matches', async () => {
  const items = [research({ title: 'Zoo' }), research({ id: 'r-2', title: 'Aquarium' })];
  await render(<ResearchList onOpen={vi.fn()} researches={items} />);
  await page.getByLabelText('Sort research').click();
  await page.getByRole('option', { name: 'Title A–Z' }).click();
  expect(
    page.getByTestId(testIds.researchCard).elements()[0]?.getAttribute('data-research-id')
  ).toBe('r-2');
  await page.getByRole('searchbox').fill('no matches');
  await expect.element(page.getByText('No research matches your search.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear research filters' }).click();
  await expect.element(page.getByRole('button', { name: 'Zoo' })).toBeVisible();
});
