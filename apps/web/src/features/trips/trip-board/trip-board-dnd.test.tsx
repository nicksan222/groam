import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { TripBoardIdea } from '@/types/trip-board';
import { TripBoardCardSlot } from './trip-board-card-slot';
import { TripBoardDnd } from './trip-board-dnd';
import { TripBoardLane } from './trip-board-lane';

const onDrop = vi.fn();

const makeIdea = (over: Partial<TripBoardIdea> = {}) =>
  ({
    author: { name: 'Sam', userId: 'user-sam' },
    canApprove: false,
    canMerge: true,
    id: 'idea-1' as Id<'tripProposals'>,
    ideaName: 'idea-1',
    status: 'in_review',
    title: 'Beach trip',
    ...over
  }) as unknown as TripBoardIdea;

function renderBoard(idea: TripBoardIdea) {
  return render(
    <TripBoardDnd onDrop={onDrop}>
      <div style={{ display: 'flex', gap: 12 }}>
        <TripBoardLane count={0} lane="agreed" />
        <TripBoardLane count={1} lane="review">
          <TripBoardCardSlot item={{ archived: false, canPropose: true, idea, kind: 'idea' }}>
            <p>Beach trip card</p>
          </TripBoardCardSlot>
        </TripBoardLane>
      </div>
    </TripBoardDnd>
  );
}

beforeEach(() => onDrop.mockReset());

describe('TripBoardDnd', () => {
  test('renders its lanes and cards', async () => {
    await renderBoard(makeIdea());
    await expect.element(page.getByRole('region', { name: 'Agreed plan' })).toBeVisible();
    await expect.element(page.getByText('Beach trip card')).toBeVisible();
  });

  test('announces how to lift a card to screen readers', async () => {
    await renderBoard(makeIdea());
    await expect
      .element(page.getByTestId('trip-board-draggable'))
      .toHaveAttribute('aria-describedby');
  });

  test('drops a lifted idea onto Agreed plan with the keyboard', async () => {
    await renderBoard(makeIdea());
    (page.getByTestId('trip-board-draggable').element() as HTMLElement).focus();
    await userEvent.keyboard(' ');
    await expect.element(page.getByTestId('trip-board-drag-preview')).toBeVisible();
    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(page.getByTestId('trip-board-lane').first()).toHaveAttribute('data-over');
    await userEvent.keyboard(' ');
    await expect.poll(() => onDrop.mock.calls.length).toBe(1);
    const [item, target] = onDrop.mock.calls[0];
    expect(item.kind).toBe('idea');
    expect(item.idea.id).toBe('idea-1');
    expect(target.lane).toBe('agreed');
  });

  test('drops nothing when the lift is cancelled', async () => {
    await renderBoard(makeIdea());
    (page.getByTestId('trip-board-draggable').element() as HTMLElement).focus();
    await userEvent.keyboard(' ');
    await expect.element(page.getByTestId('trip-board-drag-preview')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByTestId('trip-board-drag-preview')).not.toBeInTheDocument();
    expect(onDrop).not.toHaveBeenCalled();
  });
});
