import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionNav } from './trip-section-nav';

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({ issues: [] })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({ proposals: [] })
}));

const trip = {
  activity: [],
  destinations: [],
  id: 'trip-1' as Id<'trips'>,
  permissions: { canEdit: false },
  proposal: null
} as unknown as TripDetail;

test('runs the tab hairline edge to edge while the tabs stay inset', async () => {
  await render(<TripSectionNav onOpen={vi.fn()} section="overview" trip={trip} tripId={trip.id} />);

  const nav = page.getByRole('navigation', { name: 'Trip sections' }).element();
  expect(nav.className).toContain('border-b');
  expect(nav.className).toContain('w-full');
  expect(nav.className).not.toContain('px-4');

  const tabs = page.getByTestId('trip-section-overview').element().parentElement;
  expect(tabs?.className).toContain('px-4');
});

test.each(['overview', 'itinerary'] as const)(
  'combines viewing tabs on the %s URL',
  async (section) => {
    await render(
      <TripSectionNav onOpen={vi.fn()} section={section} trip={trip} tripId={trip.id} />
    );
    await expect.element(page.getByTestId('trip-section-overview')).toHaveTextContent('Trip');
    await expect.element(page.getByTestId('trip-section-itinerary')).not.toBeInTheDocument();
  }
);
