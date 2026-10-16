import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardLaneCounts } from '@/types/trip-board';
import { TripBoardScroller } from './trip-board-scroller';

const counts: TripBoardLaneCounts = {
  agreed: 1,
  closed: 2,
  in_progress: 3,
  open: 4,
  review: 5,
  wont_do: 6
};

describe('TripBoardScroller', () => {
  test('is a focusable labelled region holding its lanes', async () => {
    await render(
      <TripBoardScroller counts={counts}>
        <p>Lane content</p>
      </TripBoardScroller>
    );
    const region = page.getByRole('region', { name: 'Trip board lanes' });
    await expect.element(region).toHaveAttribute('tabindex', '0');
    await expect.element(region).toHaveAttribute('data-testid', 'trip-board-scroller');
    await expect.element(page.getByText('Lane content')).toBeVisible();
  });

  test('renders the phone lane switcher with the counts', async () => {
    await useViewport(390, 844);
    await render(
      <TripBoardScroller counts={counts}>
        <p>Lane content</p>
      </TripBoardScroller>
    );
    await expect.element(page.getByRole('navigation', { name: 'Lanes' })).toBeInTheDocument();
    await expect
      .element(page.getByTestId('trip-board-lane-tab').first())
      .toHaveTextContent('Agreed plan1');
    await expect
      .poll(() => document.querySelectorAll('[data-testid="trip-board-lane-tab"]').length)
      .toBe(6);
  });
});
