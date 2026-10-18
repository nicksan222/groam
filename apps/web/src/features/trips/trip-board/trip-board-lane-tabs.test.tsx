import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardLane, TripBoardLaneCounts } from '@/types/trip-board';
import { TripBoardLaneTabs } from './trip-board-lane-tabs';

const state = vi.hoisted(() => ({ active: null as string | null, show: vi.fn() }));

vi.mock('@/features/trips/hooks/use-trip-board-active-lane', () => ({
  useTripBoardActiveLane: () => ({ active: state.active, show: state.show })
}));

const counts: TripBoardLaneCounts = {
  agreed: 3,
  closed: 0,
  in_progress: 2,
  open: 5,
  review: undefined,
  wont_do: 1
};

beforeEach(() => {
  state.active = null;
  state.show.mockReset();
});

describe('TripBoardLaneTabs', () => {
  test('shows one tab per lane in reading order with its count', async () => {
    await render(<TripBoardLaneTabs counts={counts} scroller={{ current: null }} />);
    const tabs = page.getByTestId('trip-board-lane-tab');
    await expect.element(tabs.nth(0)).toHaveTextContent('Agreed plan3');
    await expect.element(tabs.nth(1)).toHaveTextContent('Ideas…');
    await expect.element(tabs.nth(2)).toHaveTextContent('To decide5');
    await expect.element(tabs.nth(5)).toHaveTextContent("Won't do1");
  });

  test.each<[TripBoardLane | null, string | null]>([
    [null, null],
    ['agreed', 'Agreed plan'],
    ['open', 'To decide']
  ])('marks the active lane %s as current', async (active, title) => {
    state.active = active;
    await useViewport(390, 844);
    await render(<TripBoardLaneTabs counts={counts} scroller={{ current: null }} />);
    const current = page
      .getByRole('button', { name: /./ })
      .elements()
      .filter((element) => element.getAttribute('aria-current') === 'true');
    expect(current.map((element) => element.textContent?.replace(/\d|…/g, ''))).toEqual(
      title ? [title] : []
    );
  });

  test('scrolls to the lane of the tapped tab', async () => {
    await useViewport(390, 844);
    await render(<TripBoardLaneTabs counts={counts} scroller={{ current: null }} />);
    await page.getByRole('button', { name: /Ideas/ }).click();
    expect(state.show).toHaveBeenCalledWith('review');
  });
});
