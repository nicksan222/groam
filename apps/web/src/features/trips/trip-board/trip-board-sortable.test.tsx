import { DndContext } from '@dnd-kit/core';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardDragItem, TripBoardIdea, TripBoardIssue } from '@/types/trip-board';
import { TripBoardSortable } from './trip-board-sortable';
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

const issueItem = (over: Partial<TripBoardIssue> = {}): TripBoardDragItem => ({
  archived: false,
  canPropose: true,
  issue: makeIssue('issue-1', over),
  kind: 'issue'
});
const ideaItem = (): TripBoardDragItem => ({
  archived: false,
  canPropose: true,
  idea: makeIdea('idea-1'),
  kind: 'idea'
});

describe('TripBoardSortable', () => {
  test.each<[string, TripBoardDragItem, string]>([
    ['an issue', issueItem(), 'issue-1'],
    ['an idea', ideaItem(), 'idea-1']
  ])('wraps %s as a draggable group keyed by its id', async (_, item, id) => {
    await render(
      <DndContext>
        <TripBoardSortable item={item}>
          <button type="button">Inner action</button>
        </TripBoardSortable>
      </DndContext>
    );
    const handle = page.getByTestId('trip-board-draggable');
    await expect.element(handle).toHaveAttribute('role', 'group');
    await expect.element(handle).toHaveAttribute('aria-roledescription', 'draggable card');
    await expect.element(handle).toHaveAttribute('data-card-id', id);
    await expect.element(page.getByRole('button', { name: 'Inner action' })).toBeVisible();
  });

  test('is reachable by keyboard', async () => {
    await render(
      <DndContext>
        <TripBoardSortable item={issueItem()}>Card</TripBoardSortable>
      </DndContext>
    );
    await expect.element(page.getByTestId('trip-board-draggable')).toHaveAttribute('tabindex', '0');
  });
});
