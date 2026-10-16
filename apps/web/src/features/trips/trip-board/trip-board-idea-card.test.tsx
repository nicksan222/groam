import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardContextValue, TripBoardIdea } from '@/types/trip-board';
import { TripBoardContext } from './trip-board-context';
import { TripBoardIdeaCard } from './trip-board-idea-card';

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

const context = (over: Partial<TripBoardContextValue> = {}): TripBoardContextValue => ({
  rights: { archived: false, canPropose: true },
  tripId: 'trip-1' as Id<'trips'>,
  viewerUserId: 'user-alex',
  ...over
});

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

function renderCard(idea: TripBoardIdea, viewerUserId: string | undefined = 'user-alex') {
  return render(
    <TripBoardContext.Provider value={context({ viewerUserId })}>
      <TripBoardIdeaCard proposal={idea} />
    </TripBoardContext.Provider>
  );
}

describe('TripBoardIdeaCard', () => {
  test('shows the title, author and an open link for a plain idea', async () => {
    await renderCard(makeIdea('Beach trip'));
    await expect.element(page.getByRole('heading', { name: 'Beach trip' })).toBeVisible();
    await expect.element(page.getByText(/by Sam/)).toBeVisible();
    await expect.element(page.getByTestId('idea-view')).toBeVisible();
  });

  test.each<[string, Partial<TripBoardIdea>, string]>([
    ['conflicted', { conflictCount: 2, status: 'conflicted' }, 'Needs an update'],
    ['mergeable', { canMerge: true }, 'Ready to apply'],
    ['awaiting the viewer vote', { canApprove: true }, 'Needs your vote'],
    [
      'already approved by the viewer',
      { canApprove: true, hasApproved: true },
      'Waiting for votes'
    ],
    ['without vote rights', {}, 'Waiting for votes']
  ])('flags an idea in review that is %s', async (_, over, note) => {
    await renderCard(makeIdea('Idea', over));
    await expect.element(page.getByText(note, { exact: true })).toBeVisible();
  });

  test.each<[string, Partial<TripBoardIdea>]>([
    ['applied', { status: 'merged' }],
    ['closed', { status: 'closed' }]
  ])('shows no standing note once an idea is %s', async (_, over) => {
    await renderCard(makeIdea('Idea', over));
    for (const note of [
      'Needs an update',
      'Ready to apply',
      'Needs your vote',
      'Waiting for votes'
    ])
      await expect.element(page.getByText(note, { exact: true })).not.toBeInTheDocument();
  });

  test.each([
    [1, '1 conflict'],
    [3, '3 conflicts']
  ])('counts %s conflicts on the status chip', async (conflictCount, text) => {
    await renderCard(makeIdea('Idea', { conflictCount, status: 'conflicted' }));
    await expect.element(page.getByText(new RegExp(text))).toBeVisible();
  });

  test.each([
    [0, null],
    [1, '1 open thread'],
    [4, '4 open threads']
  ])('shows %s unresolved threads as %s', async (unresolvedFeedbackCount, text) => {
    await renderCard(makeIdea('Idea', { unresolvedFeedbackCount }));
    if (text) await expect.element(page.getByText(text)).toBeVisible();
    else await expect.element(page.getByText(/open thread/)).not.toBeInTheDocument();
  });

  test('marks the viewer own draft and offers to continue it', async () => {
    await renderCard(
      makeIdea('Mine', { author: { name: 'Alex', userId: 'user-alex' }, status: 'draft' })
    );
    await expect.element(page.getByText(/Your draft/)).toBeVisible();
    await expect.element(page.getByTestId('idea-continue')).toBeVisible();
    await expect.element(page.getByTestId('idea-row')).toHaveAttribute('data-viewer-draft', 'true');
  });

  test('does not treat another traveler draft as the viewer own', async () => {
    await renderCard(makeIdea('Theirs', { status: 'draft' }));
    await expect.element(page.getByText(/by Sam/)).toBeVisible();
    await expect.element(page.getByTestId('idea-continue')).not.toBeInTheDocument();
  });

  test('exposes the idea on the card element', async () => {
    await renderCard(makeIdea('idea-7', { status: 'in_review' }));
    const card = page.getByTestId('idea-row');
    await expect.element(card).toHaveAttribute('data-idea-id', 'idea-7');
    await expect.element(card).toHaveAttribute('data-status', 'in_review');
  });
});
