import { DndContext } from '@dnd-kit/core';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardContextValue, TripBoardIdea } from '@/types/trip-board';
import { TripBoardContext } from './trip-board-context';
import { TripBoardReviewLane } from './trip-board-review-lane';
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

function renderLane({
  appliedCount = 0,
  ideas,
  onStartIdea,
  rights = { archived: false, canPropose: true },
  startingIdea = false
}: {
  appliedCount?: number;
  ideas: TripBoardIdea[] | undefined;
  onStartIdea?: () => void;
  rights?: { archived: boolean; canPropose: boolean };
  startingIdea?: boolean;
}) {
  return render(
    <DndContext>
      <TripBoardContext.Provider value={context({ rights })}>
        <TripBoardReviewLane
          appliedCount={appliedCount}
          ideas={ideas}
          onStartIdea={onStartIdea}
          startingIdea={startingIdea}
        />
      </TripBoardContext.Provider>
    </DndContext>
  );
}

describe('TripBoardReviewLane', () => {
  test('lists ideas and links to all ideas', async () => {
    await renderLane({ ideas: [makeIdea('Beach trip'), makeIdea('City break')] });
    await expect.element(page.getByRole('region', { name: 'Ideas' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Beach trip' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'City break' })).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'All ideas' }))
      .toHaveAttribute('href', '/trips/trip-1/ideas');
  });

  test('explains an empty lane', async () => {
    await renderLane({ ideas: [] });
    await expect.element(page.getByText(/No ideas yet/)).toBeVisible();
  });

  test('shows nothing but the footer link while loading', async () => {
    await renderLane({ ideas: undefined });
    await expect.element(page.getByText(/No ideas yet/)).not.toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'All ideas' })).toBeVisible();
  });

  test.each([
    [0, false],
    [3, true]
  ])('with %s applied ideas the applied count is shown: %s', async (appliedCount, shown) => {
    await renderLane({ appliedCount, ideas: [] });
    const text = page.getByText(`${appliedCount} applied`);
    if (shown) await expect.element(text).toBeVisible();
    else await expect.element(text).not.toBeInTheDocument();
  });

  test.each([
    ['can start', true, { archived: false, canPropose: true }, true],
    ['has no handler', false, { archived: false, canPropose: true }, false],
    ['cannot propose', true, { archived: false, canPropose: false }, false],
    ['is on an archived trip', true, { archived: true, canPropose: true }, false]
  ])('the start button when the viewer %s: %s', async (_, hasHandler, rights, shown) => {
    await renderLane({ ideas: [], onStartIdea: hasHandler ? vi.fn() : undefined, rights });
    const button = page.getByTestId('start-idea');
    if (shown) await expect.element(button).toBeVisible();
    else await expect.element(button).not.toBeInTheDocument();
  });

  test('starts an idea on click and disables the button while starting', async () => {
    const onStartIdea = vi.fn();
    await renderLane({ ideas: [], onStartIdea });
    await page.getByTestId('start-idea').click();
    expect(onStartIdea).toHaveBeenCalledTimes(1);
  });

  test('disables the start button while an idea is starting', async () => {
    await renderLane({ ideas: [], onStartIdea: vi.fn(), startingIdea: true });
    await expect.element(page.getByTestId('start-idea')).toBeDisabled();
  });

  test.each([
    ['in review', 'in_review', 1],
    ['applied', 'merged', 0]
  ])('an idea %s is liftable: %s', async (_, status, liftable) => {
    await renderLane({ ideas: [makeIdea('x', { status } as Partial<TripBoardIdea>)] });
    await expect
      .poll(() => document.querySelectorAll('[data-testid="trip-board-draggable"]').length)
      .toBe(liftable);
  });
});
