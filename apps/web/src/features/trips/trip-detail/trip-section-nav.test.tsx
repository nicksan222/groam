import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
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

afterEach(cleanup);

test('runs the tab hairline edge to edge while the tabs stay inset', () => {
  render(<TripSectionNav onOpen={vi.fn()} section="overview" trip={trip} tripId={trip.id} />);

  const nav = screen.getByRole('navigation', { name: 'Trip sections' });
  expect(nav.className).toContain('border-b');
  expect(nav.className).toContain('w-full');
  expect(nav.className).not.toContain('px-4');

  const tabs = screen.getByTestId('trip-section-overview').parentElement;
  expect(tabs?.className).toContain('px-4');
});

test.each(['overview', 'itinerary'] as const)('combines viewing tabs on the %s URL', (section) => {
  render(<TripSectionNav onOpen={vi.fn()} section={section} trip={trip} tripId={trip.id} />);
  expect(screen.getByTestId('trip-section-overview').textContent).toBe('Trip');
  expect(screen.queryByTestId('trip-section-itinerary')).toBeNull();
});
