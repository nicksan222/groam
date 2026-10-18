import { DndContext } from '@dnd-kit/core';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardDragItem, TripBoardIdea, TripBoardIssue } from '@/types/trip-board';
import { TripBoardCardSlot } from './trip-board-card-slot';
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

describe('TripBoardCardSlot', () => {
  test.each<[string, TripBoardDragItem, boolean]>([
    [
      'a manageable issue',
      {
        archived: false,
        canPropose: false,
        issue: makeIssue('i', { canManage: true }),
        kind: 'issue'
      },
      true
    ],
    [
      'an issue the viewer can only propose on',
      {
        archived: false,
        canPropose: true,
        issue: makeIssue('i', { canManage: false }),
        kind: 'issue'
      },
      true
    ],
    [
      'an issue the viewer has no rights on',
      {
        archived: false,
        canPropose: false,
        issue: makeIssue('i', { canManage: false }),
        kind: 'issue'
      },
      false
    ],
    [
      'an issue on an archived trip',
      { archived: true, canPropose: true, issue: makeIssue('i'), kind: 'issue' },
      false
    ],
    [
      'an idea in review',
      { archived: false, canPropose: true, idea: makeIdea('x'), kind: 'idea' },
      true
    ],
    [
      'an applied idea',
      {
        archived: false,
        canPropose: true,
        idea: makeIdea('x', { status: 'merged' }),
        kind: 'idea'
      },
      false
    ]
  ])('for %s the card is liftable: %s', async (_, item, liftable) => {
    await render(
      <DndContext>
        <TripBoardCardSlot item={item}>
          <p>Card body</p>
        </TripBoardCardSlot>
      </DndContext>
    );
    await expect.element(page.getByText('Card body')).toBeVisible();
    const handle = page.getByTestId('trip-board-draggable');
    if (liftable) await expect.element(handle).toBeInTheDocument();
    else await expect.element(handle).not.toBeInTheDocument();
  });
});
