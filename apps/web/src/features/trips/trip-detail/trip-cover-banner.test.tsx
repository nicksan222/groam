import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripCover } from '@/types/trip-cover';
import { TripCoverBanner } from './trip-cover-banner';

const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function makeCover(overrides: Partial<TripCover> = {}): TripCover {
  return {
    canRefresh: false,
    isBusy: false,
    onImageError: vi.fn(),
    refresh: vi.fn(),
    refreshLabel: 'Find another cover',
    showPending: false,
    src: null,
    ...overrides
  };
}

describe('TripCoverBanner', () => {
  test('renders a fallback surface without a photo', async () => {
    const screen = await render(
      <TripCoverBanner cover={makeCover()} slot="trip-header">
        <h1>Coast week</h1>
      </TripCoverBanner>
    );
    const root = screen.container.querySelector('[data-slot="trip-header"]');
    expect(root?.getAttribute('data-cover')).toBe('fallback');
    expect(screen.container.querySelector('img')).toBeNull();
    await expect.element(page.getByRole('heading', { name: 'Coast week' })).toBeVisible();
  });

  test('renders the image variant when a source exists', async () => {
    const screen = await render(
      <TripCoverBanner cover={makeCover({ src: pixel })} slot="trip-header">
        <h1>Coast week</h1>
      </TripCoverBanner>
    );
    expect(
      screen.container.querySelector('[data-slot="trip-header"]')?.getAttribute('data-cover')
    ).toBe('image');
    expect(screen.container.querySelector('img')?.getAttribute('src')).toBe(pixel);
  });

  test.each([
    ['pending', { showPending: true }, true],
    ['not pending', { showPending: false }, false]
  ])('while %s', async (_, overrides, visible) => {
    await render(
      <TripCoverBanner cover={makeCover(overrides)} slot="s">
        <span>x</span>
      </TripCoverBanner>
    );
    const text = page.getByText('Finding a cover image…');
    if (visible) await expect.element(text).toBeVisible();
    else await expect.element(text).not.toBeInTheDocument();
  });

  test.each([
    ['refreshable', true],
    ['not refreshable', false]
  ])('when %s', async (_, canRefresh) => {
    const cover = makeCover({ canRefresh });
    await render(
      <TripCoverBanner cover={cover} slot="s">
        <span>x</span>
      </TripCoverBanner>
    );
    const button = page.getByRole('button', { name: 'Find another cover' });
    if (!canRefresh) {
      await expect.element(button).not.toBeInTheDocument();
      return;
    }
    await button.click({ force: true });
    expect(cover.refresh).toHaveBeenCalledTimes(1);
  });
});
