import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { tripDetailRedirect } from './trip-detail-redirect';

vi.mock('@tanstack/react-router', () => ({
  Navigate: (props: { params: unknown; search: unknown; to: string }) => (
    <output data-testid="navigate">{JSON.stringify(props)}</output>
  )
}));

vi.mock('@/features/trips/trip-detail/trip-not-found', () => ({
  TripNotFound: () => <p>Trip not found</p>
}));

vi.mock('./trip-not-found', () => ({ TripNotFound: () => <p>Trip not found</p> }));

const sharedTrip = { id: 'trip-1', proposal: null } as unknown as TripDetail;
const ideaTrip = {
  id: 'trip-working',
  proposal: { sourceTripId: 'trip-source' }
} as unknown as TripDetail;
const proposals = [{ id: 'prop-1', workingTripId: 'trip-working' }] as never;

const base = {
  addDestinationOpen: false,
  exists: true,
  proposals,
  section: 'board',
  trip: sharedTrip,
  tripReference: 'trip-ref'
} as const;

describe('tripDetailRedirect', () => {
  test.each([
    ['trip is loading', { trip: undefined }],
    ['shared trip on a tab section', { section: 'board' }],
    ['shared trip on overview', { section: 'overview' }],
    ['idea trip while proposals load', { proposals: undefined, trip: ideaTrip }]
  ] as const)('returns nothing: %s', (_, overrides) => {
    expect(tripDetailRedirect({ ...base, ...overrides } as never)).toBeNull();
  });

  test('shows not found when the trip does not exist', async () => {
    await render(<>{tripDetailRedirect({ ...base, exists: false })}</>);
    await expect.element(page.getByText('Trip not found')).toBeVisible();
  });

  test('sends a shared trip itinerary to the overview tab, keeping the day', async () => {
    await render(<>{tripDetailRedirect({ ...base, day: 3, section: 'itinerary' })}</>);
    const payload = JSON.parse((await page.getByTestId('navigate').element().textContent) ?? '{}');
    expect(payload.to).toBe('/trips/$tripId/$section');
    expect(payload.params).toEqual({ section: 'overview', tripId: 'trip-ref' });
    expect(payload.search).toEqual({ day: 3 });
  });

  test('omits the day search when none is given', async () => {
    await render(<>{tripDetailRedirect({ ...base, section: 'itinerary' })}</>);
    const payload = JSON.parse((await page.getByTestId('navigate').element().textContent) ?? '{}');
    expect(payload.search).toEqual({});
  });

  test('sends an idea working copy to its idea workspace', async () => {
    await render(<>{tripDetailRedirect({ ...base, section: 'itinerary', trip: ideaTrip })}</>);
    const payload = JSON.parse((await page.getByTestId('navigate').element().textContent) ?? '{}');
    expect(payload.to).toBe('/trips/$tripId/ideas/$proposalId/$view');
    expect(payload.params).toEqual({
      proposalId: 'prop-1',
      tripId: 'trip-source',
      view: 'itinerary'
    });
  });
});
