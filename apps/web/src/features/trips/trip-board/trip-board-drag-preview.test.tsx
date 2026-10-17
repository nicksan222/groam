import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { boardLink } from '@/features/trips/testing/trip-board-fixtures';
import type { TripBoardIdea, TripBoardIssue } from '@/types/trip-board';
import type { TripBoardDragItem } from '@/types/trip-board';
import { TripBoardDragPreview } from './trip-board-drag-preview';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    search,
    to,
    ...rest
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    to: string;
  }) => (
    <a
      {...rest}
      href={
        Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to) +
        (search && Object.keys(search).length > 0
          ? `?${new URLSearchParams(search as Record<string, string>)}`
          : '')
      }
    >
      {children}
    </a>
  )
}));
const makeIssue = (id: string, over: Partial<TripBoardIssue> = {}) =>
  ({
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    canAssign: true,
    canManage: true,
    condition: null,
    dueAt: null,
    id: id as Id<'tripIssues'>,
    idea: null,
    labels: [],
    rank: 0,
    status: 'open',
    title: id,
    updatedAt: Date.UTC(2026, 7, 17),
    ...over
  }) as unknown as TripBoardIssue;

const makeIdea = (id: string, over: Partial<TripBoardIdea> = {}) =>
  ({
    author: { name: 'Sam', userId: 'user-sam' },
    baseUpdatedAt: 0,
    canApprove: false,
    canMerge: false,
    canRebase: false,
    conflictCount: 0,
    feedbackCount: 0,
    hasApproved: false,
    id: id as Id<'tripProposals'>,
    ideaName: id,
    issueId: null,
    status: 'in_review',
    submittedAt: null,
    title: id,
    unresolvedFeedbackCount: 0,
    updatedAt: Date.now(),
    workingTripId: 'trip-work' as Id<'trips'>,
    ...over
  }) as unknown as TripBoardIdea;

describe('TripBoardDragPreview', () => {
  test('previews an issue as an issue card', async () => {
    const item: TripBoardDragItem = {
      archived: false,
      canPropose: true,
      issue: makeIssue('Book flights'),
      kind: 'issue'
    };
    await render(<TripBoardDragPreview item={item} />);
    await expect.element(page.getByTestId('trip-board-drag-preview')).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Book flights' })).toBeVisible();
  });

  test('keeps the idea pairing and its hue on the lifted issue', async () => {
    const closed = {
      id: 'idea-new',
      status: 'closed',
      title: 'Camping',
      workingTripId: 'trip-work'
    };
    const item: TripBoardDragItem = {
      archived: false,
      canPropose: true,
      issue: makeIssue('Book flights', { idea: closed } as Partial<TripBoardIssue>),
      kind: 'issue',
      link: boardLink('Hostel', { tone: 2 })
    };
    await render(<TripBoardDragPreview item={item} />);
    await expect.element(page.getByText('Idea closed')).not.toBeInTheDocument();
    await expect
      .element(page.getByText('Idea in review').element().parentElement!)
      .toHaveClass(/bg-chart-4/);
  });

  test('previews an idea as a card with an Idea chip', async () => {
    const item: TripBoardDragItem = {
      archived: false,
      canPropose: true,
      idea: makeIdea('Add Lisbon', { title: 'Add Lisbon' }),
      kind: 'idea'
    };
    await render(<TripBoardDragPreview item={item} />);
    await expect.element(page.getByTestId('trip-board-drag-preview')).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Add Lisbon' })).toBeVisible();
    await expect.element(page.getByText('Idea', { exact: true })).toBeVisible();
  });
});
