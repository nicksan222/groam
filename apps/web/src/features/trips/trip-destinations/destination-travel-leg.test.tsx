import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { DestinationTravelLeg } from './destination-travel-leg';
import type { Destination, TripActivityActions } from './destination-types';

vi.mock('@/features/trips/hooks/use-itinerary-proposal-changes', () => ({
  useItineraryChange: () => null
}));

const id = <Table extends 'tripDestinations'>(value: string) => value as Id<Table>;

function destination(overrides: Partial<Destination> = {}): Destination {
  return {
    activities: [],
    coverStatus: null,
    coverUrl: null,
    dayNotes: null,
    endDay: 4,
    id: id('destination-lisbon'),
    latitude: 38.7,
    longitude: -9.1,
    name: 'Lisbon',
    placeId: 'place-lisbon',
    position: 0,
    sourceId: id('source-lisbon'),
    startDay: 1,
    stays: [],
    transferToNext: null,
    ...overrides
  } as Destination;
}

const actions = {
  removeDestinationTransfer: vi.fn(),
  setDestinationTransfer: vi.fn()
} as unknown as TripActivityActions;

async function renderLeg(
  options: {
    canManage?: boolean;
    next?: Destination | undefined;
  } = {},
  hasNext = true
) {
  const next = hasNext
    ? (options.next ??
      destination({
        endDay: 7,
        id: id('destination-porto'),
        name: 'Porto',
        position: 1,
        startDay: 5
      }))
    : undefined;
  return render(
    <DestinationTravelLeg
      actions={actions}
      canManage={options.canManage ?? true}
      currency="EUR"
      destination={destination()}
      nextDestination={next}
      startDate="2026-08-12"
      tripDayCount={10}
    />
  );
}

test('shows a full-width hop between stops with no timeline rail', async () => {
  const { container } = await renderLeg();

  expect(container.querySelector('[data-slot="destination-stop-rail"]')).toBeNull();
  const hop = page.getByTestId(testIds.destinationTravelLeg);
  await expect.element(hop).toHaveClass('w-full');
  await expect.element(hop).not.toHaveClass('justify-center');
  await expect.element(hop).not.toHaveClass('py-8');
  const leg = hop.element().querySelector('[data-slot="destination-travel-leg"]');
  expect(leg?.className).toContain('w-full');
  expect(leg?.className).not.toContain('max-w-sm');
  expect(leg?.className).not.toContain('bg-muted');
  await expect.element(page.getByText('How we go')).toBeInTheDocument();
  await expect.element(page.getByText('Lisbon')).toBeInTheDocument();
  await expect.element(page.getByText('Porto')).toBeInTheDocument();
  await expect
    .element(page.getByText('Travel not planned yet — flight, train, drive, ferry, or TBD.'))
    .toBeInTheDocument();
  await expect.element(page.getByTestId(testIds.planTravel)).toBeInTheDocument();
  await expect.element(page.getByText('Plan travel')).toBeInTheDocument();
});

test('keeps the empty hop for viewers who cannot edit travel', async () => {
  await renderLeg({ canManage: false });

  await expect.element(page.getByTestId(testIds.destinationTravelLeg)).toBeInTheDocument();
  await expect
    .element(page.getByText('Travel not planned yet — flight, train, drive, ferry, or TBD.'))
    .toBeInTheDocument();
  await expect.element(page.getByTestId(testIds.planTravel)).not.toBeInTheDocument();
});

test('renders nothing after the last stop', async () => {
  const { container } = await renderLeg({}, false);
  expect(container.firstChild).toBeNull();
});
