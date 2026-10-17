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

test('renders cards and opens one', async () => {
  const onOpen = vi.fn();
  const items = [
    research({}),
    research({ brief: 'Skip the queues', id: 'r-2', title: 'Museums', unread: false })
  ];
  await render(<ResearchList onCreate={vi.fn()} onOpen={onOpen} researches={items} />);
  await expect.element(page.getByText('Hotels in Rome').first()).toBeVisible();
  await expect.element(page.getByText('Compare central hotels')).toBeVisible();
  await expect.element(page.getByText('Found a cheap one').first()).toBeInTheDocument();
  await expect.element(page.getByText('3 people').first()).toBeVisible();
  await expect.element(page.getByText('2 links').first()).toBeVisible();
  expect(page.getByTestId(testIds.researchUnread).elements()).toHaveLength(1);
  await page.getByText('Museums').click();
  expect(onOpen).toHaveBeenCalledWith(items[1]);
});
