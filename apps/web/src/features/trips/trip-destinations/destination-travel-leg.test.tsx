import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { testIds } from '@/lib/test-ids';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { DestinationTravelLeg } from './destination-travel-leg';
import type { Destination, TripActivityActions } from './destination-types';

vi.mock('@/features/trips/hooks/use-itinerary-proposal-changes', () => ({
  useItineraryChange: () => null
}));

afterEach(() => cleanup());

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

function renderLeg(
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
  stubMatchMedia();
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

test('shows a full-width hop between stops with no timeline rail', () => {
  const { container } = renderLeg();

  expect(container.querySelector('[data-slot="destination-stop-rail"]')).toBeNull();
  const hop = screen.getByTestId(testIds.destinationTravelLeg);
  expect(hop).toBeTruthy();
  expect(hop.className).toContain('w-full');

  expect(hop.className).not.toContain('justify-center');
  expect(hop.className).not.toContain('py-8');
  const leg = hop.querySelector('[data-slot="destination-travel-leg"]');
  expect(leg?.className).toContain('w-full');
  expect(leg?.className).not.toContain('max-w-sm');
  expect(leg?.className).not.toContain('bg-muted');
  expect(screen.getByText('How we go')).toBeTruthy();
  expect(screen.getByText('Lisbon')).toBeTruthy();
  expect(screen.getByText('Porto')).toBeTruthy();
  expect(
    screen.getByText('Travel not planned yet — flight, train, drive, ferry, or TBD.')
  ).toBeTruthy();
  expect(screen.getByTestId(testIds.planTravel)).toBeTruthy();
  expect(screen.getByText('Plan travel')).toBeTruthy();
});

test('keeps the empty hop for viewers who cannot edit travel', () => {
  renderLeg({ canManage: false });

  expect(screen.getByTestId(testIds.destinationTravelLeg)).toBeTruthy();
  expect(
    screen.getByText('Travel not planned yet — flight, train, drive, ferry, or TBD.')
  ).toBeTruthy();
  expect(screen.queryByTestId(testIds.planTravel)).toBeNull();
});

test('renders nothing after the last stop', () => {
  const { container } = renderLeg({}, false);
  expect(container.firstChild).toBeNull();
});
