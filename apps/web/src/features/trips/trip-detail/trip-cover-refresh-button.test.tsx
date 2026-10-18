import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripCover } from '@/types/trip-cover';
import { TripCoverRefreshButton } from './trip-cover-refresh-button';

function makeCover(overrides: Partial<TripCover> = {}): TripCover {
  return {
    canRefresh: true,
    isBusy: false,
    onImageError: vi.fn(),
    refresh: vi.fn(),
    refreshLabel: 'Find another cover',
    showPending: false,
    src: null,
    ...overrides
  };
}

describe('TripCoverRefreshButton', () => {
  test('refreshes when clicked', async () => {
    const cover = makeCover();
    await render(<TripCoverRefreshButton cover={cover} />);
    await page.getByRole('button', { name: 'Find another cover' }).click();
    expect(cover.refresh).toHaveBeenCalledTimes(1);
  });

  test('is disabled and busy while refreshing', async () => {
    await render(<TripCoverRefreshButton cover={makeCover({ isBusy: true })} />);
    const button = page.getByRole('button', { name: 'Find another cover' });
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('aria-busy', 'true');
  });
});
