import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { ItineraryDetailsBanner } from './itinerary-details-banner';

const resolve = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  setOpen: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-itinerary-details-resolve', () => ({
  useItineraryDetailsResolve: () => ({ ...resolve.state, setOpen: resolve.setOpen })
}));

vi.mock('@/features/trips/itinerary-proposal-highlight/itinerary-details-change-card', () => ({
  ItineraryDetailsChangeCard: ({
    canResolve,
    onResolve
  }: {
    canResolve: boolean;
    onResolve: () => void;
  }) => (
    <button disabled={!canResolve} onClick={onResolve} type="button">
      Resolve details
    </button>
  )
}));

vi.mock('@/features/trips/itinerary-proposal-highlight/itinerary-details-resolve-sheet', () => ({
  ItineraryDetailsResolveSheet: ({
    open,
    sourceTripId
  }: {
    open: boolean;
    sourceTripId: string;
  }) => (
    <p>
      sheet:{String(open)}:{sourceTripId}
    </p>
  )
}));

const change = { fields: [], key: 'details' } as unknown as ItineraryChange;
const makeTrip = (proposal?: { sourceTripId: string }) =>
  ({ id: 'trip-working', proposal }) as unknown as TripDetail;

beforeEach(() => {
  resolve.setOpen.mockReset();
  resolve.state = { canResolve: true, hasDetailConflicts: true, open: false, pending: false };
});

describe('ItineraryDetailsBanner', () => {
  test('renders nothing without a change', async () => {
    await render(<ItineraryDetailsBanner change={null} trip={makeTrip()} />);
    await expect.element(page.getByText(/sheet:/u)).not.toBeInTheDocument();
  });

  test('renders nothing when there are no detail conflicts and the sheet is closed', async () => {
    resolve.state = { hasDetailConflicts: false, open: false };
    await render(<ItineraryDetailsBanner change={change} trip={makeTrip()} />);
    await expect.element(page.getByText(/sheet:/u)).not.toBeInTheDocument();
  });

  test('shows the card and opens the resolve sheet on resolve', async () => {
    await render(<ItineraryDetailsBanner change={change} trip={makeTrip()} />);
    await page.getByRole('button', { name: 'Resolve details' }).click();
    expect(resolve.setOpen).toHaveBeenCalledWith(true);
  });

  test('keeps the sheet mounted while open even after conflicts clear', async () => {
    resolve.state = { hasDetailConflicts: false, open: true };
    await render(<ItineraryDetailsBanner change={change} trip={makeTrip()} />);
    await expect.element(page.getByText('sheet:true:trip-working')).toBeVisible();
  });

  test('uses the proposal source trip when the trip is an idea', async () => {
    await render(
      <ItineraryDetailsBanner change={change} trip={makeTrip({ sourceTripId: 'trip-shared' })} />
    );
    await expect.element(page.getByText('sheet:false:trip-shared')).toBeVisible();
  });

  test('disables resolving when the viewer cannot resolve', async () => {
    resolve.state = { canResolve: false, hasDetailConflicts: true, open: false };
    await render(<ItineraryDetailsBanner change={change} trip={makeTrip()} />);
    await expect.element(page.getByRole('button', { name: 'Resolve details' })).toBeDisabled();
  });
});
