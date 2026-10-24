import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { tripDetailRedirect } from './trip-detail-redirect';

vi.mock('@/lib/navigation/router', () => ({
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

const base = { exists: true, proposals, trip: sharedTrip } as const;

describe('tripDetailRedirect', () => {
  test.each([
    ['trip is loading', { trip: undefined }],
    ['shared trip', {}],
    ['idea trip while proposals load', { proposals: undefined, trip: ideaTrip }]
  ] as const)('returns nothing: %s', (_, overrides) => {
    expect(tripDetailRedirect({ ...base, ...overrides } as never)).toBeNull();
  });

  test('shows not found when the trip does not exist', async () => {
    await render(<>{tripDetailRedirect({ ...base, exists: false })}</>);
    await expect.element(page.getByText('Trip not found')).toBeVisible();
  });

  test('sends an idea working copy to its idea workspace', async () => {
    await render(<>{tripDetailRedirect({ ...base, trip: ideaTrip })}</>);
    const payload = JSON.parse((await page.getByTestId('navigate').element().textContent) ?? '{}');
    expect(payload.to).toBe('/trips/$tripId/ideas/$proposalId/$view');
    expect(payload.params).toEqual({
      proposalId: 'prop-1',
      tripId: 'trip-source',
      view: 'overview'
    });
  });
});
