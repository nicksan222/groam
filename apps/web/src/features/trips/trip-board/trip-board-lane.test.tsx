import { DndContext } from '@dnd-kit/core';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardDragItem, TripBoardIdea } from '@/types/trip-board';
import { TripBoardDragContext } from './trip-board-drag-state';
import { TripBoardLane } from './trip-board-lane';
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

function renderLane(
  props: Partial<React.ComponentProps<typeof TripBoardLane>> = {},
  drag: { item: TripBoardDragItem | null; lane?: string } = { item: null }
) {
  const target = drag.lane ? { index: 0, lane: drag.lane, unchanged: false } : null;
  return render(
    <DndContext>
      <TripBoardDragContext.Provider value={{ item: drag.item, target } as never}>
        <TripBoardLane count={1} lane="open" {...props}>
          <p>A card</p>
        </TripBoardLane>
      </TripBoardDragContext.Provider>
    </DndContext>
  );
}

const readyIdea = (canMerge: boolean): TripBoardDragItem => ({
  archived: false,
  canPropose: true,
  idea: makeIdea('idea-1', { canMerge }),
  kind: 'idea'
});

describe('TripBoardLane', () => {
  test('titles the lane and shows its cards', async () => {
    await renderLane();
    await expect.element(page.getByRole('region', { name: 'To decide' })).toBeVisible();
    await expect.element(page.getByText('A card')).toBeVisible();
    await expect.element(page.getByTestId('trip-board-lane')).toHaveAttribute('data-lane', 'open');
  });

  test.each([
    ['an empty note when empty', 0, 'Nothing here', true],
    ['no empty note when it has cards', 2, 'Nothing here', false]
  ])('shows %s', async (_, count, text, shown) => {
    await renderLane({ count, empty: 'Nothing here' });
    const note = page.getByText(text);
    if (shown) {
      await expect.element(note).toBeVisible();
      await expect.element(page.getByText('A card')).not.toBeInTheDocument();
    } else await expect.element(note).not.toBeInTheDocument();
  });

  test('keeps the cards when empty but no note is given', async () => {
    await renderLane({ count: 0 });
    await expect.element(page.getByText('A card')).toBeVisible();
  });

  test('renders the optional meta and footer', async () => {
    await renderLane({
      footer: <button type="button">Footer action</button>,
      meta: <p>Meta line</p>
    });
    await expect.element(page.getByText('Meta line')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Footer action' })).toBeVisible();
  });

  test('omits the footer when none is given', async () => {
    await renderLane();
    await expect.element(page.getByRole('contentinfo')).not.toBeInTheDocument();
  });

  test('is a soft dashed container when quiet', async () => {
    await renderLane({ quiet: true });
    await expect.element(page.getByTestId('trip-board-lane')).toHaveClass('border-dashed');
  });

  test.each<[string, boolean, string]>([
    ['allows an idea that can be applied', true, 'allowed'],
    ['refuses an idea that still needs approvals', false, 'refused']
  ])('while an idea is lifted over Agreed plan, the lane %s', async (_, canMerge, outcome) => {
    await renderLane({ lane: 'agreed' }, { item: readyIdea(canMerge), lane: 'agreed' });
    await expect.element(page.getByTestId('trip-board-lane')).toHaveAttribute('data-drop', outcome);
    const hint = page.getByTestId('trip-board-drop-hint');
    if (outcome === 'refused') {
      await expect.element(hint).toBeVisible();
      await expect
        .element(page.getByText('Needs approvals before it can be applied'))
        .toBeVisible();
    } else await expect.element(hint).not.toBeInTheDocument();
  });

  test('does not mark a lane the lifted card cannot enter', async () => {
    await renderLane({ lane: 'open' }, { item: readyIdea(true), lane: 'open' });
    await expect
      .element(page.getByTestId('trip-board-lane'))
      .toHaveAttribute('data-drop', 'unavailable');
    await expect.element(page.getByTestId('trip-board-drop-hint')).not.toBeInTheDocument();
  });
});
