import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripOverview } from '@/features/trips/trip-overview/trip-overview';
import { TripPageShell } from './trip-page-shell';
import { TripToolbarSkeleton } from './trip-toolbar-skeleton';

test('trip notice sits below the header and navigation', async () => {
  await render(
    <TripPageShell
      banner={<div data-testid="trip-notice">Notice</div>}
      body={<div>Trip content</div>}
      hero={<div>Trip title</div>}
      nav={<div>Trip sections</div>}
    />
  );

  const notice = page.getByTestId('trip-notice').element();
  expect(notice.previousElementSibling?.textContent).toBe('Trip sections');
});

test('trip page uses one shared loading surface without rendering its unknown content', async () => {
  const { container } = await render(
    <TripPageShell
      body={<TripOverview isLoading />}
      hero={<TripToolbarSkeleton />}
      isLoading
      nav={null}
    />
  );

  await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeInTheDocument();
  expect(container.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
});
