import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { WorkingTripRedirect } from './working-trip-redirect';

vi.mock('@/lib/navigation/router', () => ({
  Navigate: (props: { params: unknown; search: unknown; to: string }) => (
    <output data-testid="navigate">{JSON.stringify(props)}</output>
  )
}));

vi.mock('@/features/trips/trip-detail/trip-not-found', () => ({
  TripNotFound: () => <p>Trip not found</p>
}));

const workingTrip = {
  id: 'trip-working',
  proposal: { sourceTripId: 'trip-source' }
} as unknown as TripDetail;
const proposals = [{ id: 'prop-1', workingTripId: 'trip-working' }] as never;

function navigateTarget() {
  return page.getByTestId('navigate');
}

describe('WorkingTripRedirect', () => {
  test('renders nothing for a trip that is not an idea working copy', async () => {
    await render(
      <WorkingTripRedirect
        proposals={proposals}
        trip={{ id: 'x', proposal: null } as unknown as TripDetail}
      />
    );
    await expect.element(navigateTarget()).not.toBeInTheDocument();
  });

  test('waits while proposals load', async () => {
    await render(<WorkingTripRedirect proposals={undefined} trip={workingTrip} />);
    await expect.element(navigateTarget()).not.toBeInTheDocument();
    await expect.element(page.getByText('Trip not found')).not.toBeInTheDocument();
  });

  test('shows not found when no proposal owns the working trip', async () => {
    await render(<WorkingTripRedirect proposals={[]} trip={workingTrip} />);
    await expect.element(page.getByText('Trip not found')).toBeVisible();
  });

  test('redirects to the idea overview', async () => {
    await render(<WorkingTripRedirect proposals={proposals} trip={workingTrip} />);
    const payload = JSON.parse((await navigateTarget().element().textContent) ?? '{}');
    expect(payload.to).toBe('/trips/$tripId/ideas/$proposalId/$view');
    expect(payload.params).toEqual({
      proposalId: 'prop-1',
      tripId: 'trip-source',
      view: 'overview'
    });
    expect(payload.search).toEqual({});
  });
});
