import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardIssue } from '@/types/trip-board';
import { TripBoardMandatoryProgress } from './trip-board-mandatory-progress';

const issue = (id: string, over: Partial<TripBoardIssue> = {}) =>
  ({
    assignee: null,
    id: id as Id<'tripIssues'>,
    labels: [],
    status: 'open',
    title: id,
    ...over
  }) as unknown as TripBoardIssue;

describe('TripBoardMandatoryProgress', () => {
  test.each<[string, TripBoardIssue[] | undefined]>([
    ['loading', undefined],
    ['no issues', []],
    ['no mandatory issues', [issue('a'), issue('b', { status: 'closed' })]]
  ])('renders nothing while %s', async (_, issues) => {
    await render(<TripBoardMandatoryProgress issues={issues} />);
    await expect.element(page.getByRole('progressbar')).not.toBeInTheDocument();
  });

  test.each([
    ['none done', ['open', 'in_progress'], '0 of 2 mandatory done'],
    ['some done', ['closed', 'open', 'wont_do'], '1 of 3 mandatory done'],
    ['all done', ['closed', 'closed'], '2 of 2 mandatory done']
  ])('summarises %s', async (_, statuses, summary) => {
    const issues = [
      ...statuses.map((status, index) =>
        issue(`m${index}`, { labels: ['mandatory'], status } as Partial<TripBoardIssue>)
      ),
      issue('other', { status: 'closed' })
    ];
    await render(<TripBoardMandatoryProgress issues={issues} />);
    await expect.element(page.getByText(summary)).toBeInTheDocument();
    await expect
      .element(page.getByRole('progressbar', { name: 'Mandatory issues' }))
      .toHaveAttribute('aria-valuetext', summary);
  });
});
