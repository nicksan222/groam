import { render } from '@groam/vitest-config/react';
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

test('renders a table row per research and opens one', async () => {
  const onOpen = vi.fn();
  const items = [
    research({}),
    research({ brief: null, id: 'r-2', lastMessage: null, title: 'Museums', unread: false })
  ];
  await render(<ResearchList onCreate={vi.fn()} onOpen={onOpen} researches={items} />);
  await expect.element(page.getByRole('table')).toBeVisible();
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
