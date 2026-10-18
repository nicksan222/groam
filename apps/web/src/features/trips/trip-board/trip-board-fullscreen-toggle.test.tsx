import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripBoardFullscreenToggle } from './trip-board-fullscreen-toggle';

const state = vi.hoisted(() => ({
  active: false,
  supported: true,
  toggle: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-board-fullscreen', () => ({
  useTripBoardFullscreen: () => state
}));

beforeEach(() => {
  state.active = false;
  state.supported = true;
  state.toggle.mockClear();
});

describe('TripBoardFullscreenToggle', () => {
  test('renders nothing where fullscreen is unsupported', async () => {
    state.supported = false;
    await render(<TripBoardFullscreenToggle />);
    await expect.element(page.getByRole('button', { name: 'Full screen' })).not.toBeInTheDocument();
  });

  test.each([
    ['off', false, 'false'],
    ['on', true, 'true']
  ])('reports the pressed state when fullscreen is %s', async (_, active, pressed) => {
    state.active = active;
    await render(<TripBoardFullscreenToggle />);
    await expect
      .element(page.getByRole('button', { name: 'Full screen' }))
      .toHaveAttribute('aria-pressed', pressed);
  });

  test('toggles fullscreen on click', async () => {
    await render(<TripBoardFullscreenToggle />);
    await page.getByRole('button', { name: 'Full screen' }).click({ force: true });
    expect(state.toggle).toHaveBeenCalledTimes(1);
  });
});
