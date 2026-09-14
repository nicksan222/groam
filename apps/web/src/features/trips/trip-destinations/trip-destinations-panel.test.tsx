import type { Id } from '@groam/backend/data-model';
import { stubPopoverEnvironment } from '@groam/ui/lib/stub-popover-environment';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { plannerActivity } from '@/testing/trip-planner-fixture';
import { TripDestinationsPanel } from './trip-destinations-panel';

const versions = vi.hoisted(() => ({
  proposal: undefined as
    | {
        changes: ItineraryChange[];
        conflicts: [];
        sourceChanged: boolean;
      }
    | undefined,
  proposals: [] as Array<{ id: string; workingTripId: string }>
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripProposalDetail: () => versions.proposal,
  useTripVersion: () => ({ proposal: versions.proposal }),
  useTripVersions: () => ({
    createVersion: vi.fn(),
    proposals: versions.proposals
  })
}));

vi.mock('convex/react', () => ({
  useAction: () => vi.fn().mockResolvedValue({ kind: 'applied' }),
  useMutation: () => vi.fn(),
  useQuery: () => undefined
}));

vi.mock('@/features/trips/trip-destinations/trip-destinations-map', () => ({
  TripDestinationsMap: () => null
}));

vi.mock('@/features/trips/trip-destinations/add-trip-destination-dialog', () => ({
  AddTripDestinationDialog: () => null
}));

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => vi.fn()
}));

const id = <
  Table extends 'tripDestinationActivities' | 'tripDestinations' | 'tripProposals' | 'trips'
>(
  value: string
) => value as Id<Table>;

const handlers = {
  addActivity: vi.fn(),
  addDestination: vi.fn(),
  addStay: vi.fn(),
  moveDestination: vi.fn(),
  onAddDestination: vi.fn(),
  onAddDestinationClose: vi.fn(),
  onOpenOverview: vi.fn(),
  onStartIdea: vi.fn(),
  removeActivity: vi.fn(),
  removeActivityTransfer: vi.fn(),
  removeBoundaryTransfer: vi.fn(),
  reorderActivities: vi.fn(),
  removeDestination: vi.fn(),
  removeDestinationTransfer: vi.fn(),
  removeStay: vi.fn(),
  setActivityTransfer: vi.fn(),
  setBoundaryTransfer: vi.fn(),
  setDestinationTransfer: vi.fn(),
  updateActivity: vi.fn(),
  updateDestination: vi.fn(),
  updateStay: vi.fn(),
  updateTrip: vi.fn().mockResolvedValue(true)
};

function destination(
  overrides: Partial<TripDetail['destinations'][number]> = {}
): TripDetail['destinations'][number] {
  return {
    activities: [],
    coverStatus: null,
    coverUrl: null,
    dayNotes: null,
    endDay: 4,
    id: id<'tripDestinations'>('destination-lisbon'),
    latitude: 38.7,
    longitude: -9.1,
    name: 'Lisbon',
    placeId: 'place-lisbon',
    position: 0,
    sourceId: id<'tripDestinations'>('source-lisbon'),
    startDay: 1,
    stays: [],
    transferToNext: null,
    ...overrides
  };
}

function tripDetail(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    activity: [],
    archivedAt: null,
    arrivalTransfer: null,
    coverAttribution: null,
    coverStatus: 'ready',
    coverUrl: null,
    currency: 'EUR',
    dateNotes: null,
    departureTransfer: null,
    destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
    destinations: [destination()],
    groupMemberCount: 3,
    id: id<'trips'>('working-1'),
    initialBudget: null,
    name: 'Summer escape',
    permissions: {
      canArchive: false,
      canEdit: true,
      canEditCover: true,
      canPropose: false,
      canRestore: false,
      isReadOnly: false
    },
    proposal: {
      author: { name: 'Alex Morgan', userId: 'user-alex' },
      baseUpdatedAt: Date.UTC(2026, 7, 16),
      ideaName: 'coast-day',
      sourceTripId: id<'trips'>('source-1'),
      status: 'draft'
    },
    role: 'organizer',
    startDate: null,
    totalDurationDays: 7,
    totalPlannedCost: 0,
    ...overrides
  } as TripDetail;
}

function change(overrides: Partial<ItineraryChange> = {}): ItineraryChange {
  return {
    change: 'modified',
    entity: 'destination',
    fields: [],
    key: 'destinations/source-lisbon.json',
    label: 'Lisbon',
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  stubPopoverEnvironment();
  stubMatchMedia();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    }
  );
  versions.proposal = undefined;
  versions.proposals = [];
});

afterEach(cleanup);

describe('TripDestinationsPanel day editor', () => {
  test('keeps shared plans read-only', () => {
    const trip = tripDetail({ proposal: null });
    trip.permissions.canEdit = false;
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={trip} />);
    expect(screen.getByRole('heading', { name: 'Day 1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add a plan' })).toBeNull();
    expect(screen.queryByLabelText('Itinerary editor')).toBeNull();
  });
  test('gives an empty idea one clear starting action', () => {
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ destinations: [] })}
      />
    );
    expect(screen.getByText('A place to start. A day to fill.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add first destination' }));
    expect(handlers.onAddDestination).toHaveBeenCalledOnce();
  });
  test('shows every day without a redundant day picker', () => {
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);
    expect(screen.getByRole('heading', { name: 'Day 1' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Day 2' })).toBeTruthy();
    expect(screen.getAllByText('A day of possibilities').length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Day 1 schedule' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Day 2 schedule' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Choose a day' })).toBeNull();
    expect(screen.queryByRole('tablist', { name: 'Planning tools' })).toBeNull();
    expect(handlers.updateTrip).not.toHaveBeenCalled();
    expect(handlers.updateDestination).not.toHaveBeenCalled();
  });
  test('preserves occupied-day constraints in the selected route stop', () => {
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({
          destinations: [
            destination({ endDay: 2 }),
            destination({
              id: id<'tripDestinations'>('porto'),
              name: 'Porto',
              startDay: 3,
              endDay: 7
            })
          ]
        })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Porto.*Days/u }));
    expect(screen.getByRole('button', { name: 'Day 1, Taken' }).hasAttribute('data-taken')).toBe(
      true
    );
  });
  test('preserves change highlights and removed items in the route summary', () => {
    versions.proposals = [{ id: 'proposal-1', workingTripId: 'working-1' }];
    versions.proposal = {
      changes: [
        change(),
        change({ change: 'added', key: 'destinations/porto.json', label: 'Porto' }),
        change({ change: 'removed', key: 'destinations/faro.json', label: 'Faro' })
      ],
      conflicts: [],
      sourceChanged: false
    };
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({
          destinations: [
            destination(),
            destination({ id: id<'tripDestinations'>('porto'), name: 'Porto', sourceId: null })
          ]
        })}
      />
    );
    expect(document.querySelector('[data-proposal-change="modified"]')).toBeTruthy();
    expect(document.querySelector('[data-proposal-change="added"]')).toBeTruthy();
    expect(document.querySelector('[data-proposal-change="removed"]')).toBeTruthy();
    expect(screen.getByText('Faro')).toBeTruthy();
  });
  test('adds a plan on the chosen day and period through the existing idea action', async () => {
    handlers.addActivity.mockResolvedValue(true);
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add a plan' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Activity' }));
    fireEvent.click(screen.getByLabelText('Day'));
    fireEvent.click(screen.getByRole('option', { name: 'Day 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Afternoon' }));
    fireEvent.change(screen.getByPlaceholderText('What are we doing?'), {
      target: { value: 'Museum visit' }
    });
    fireEvent.click(screen.getByTestId(testIds.activitySubmit));
    await waitFor(() =>
      expect(handlers.addActivity).toHaveBeenCalledWith(
        'destination-lisbon',
        expect.objectContaining({
          title: 'Museum visit',
          schedule: { day: 2, timeBlock: 'afternoon' }
        })
      )
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  test('allows plans before a trip duration has been chosen', () => {
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ totalDurationDays: null })}
      />
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add a plan' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId(testIds.activitySubmit)).toBeTruthy();
  });
  test('opens an existing plan and saves its identity without creating a duplicate', async () => {
    handlers.updateActivity.mockResolvedValue(true);
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ destinations: [destination({ activities: [plannerActivity()] })] })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit Explore the tile museum' }));
    expect((screen.getByLabelText('Start time (optional)') as HTMLInputElement).value).toBe(
      '10:00'
    );
    fireEvent.change(screen.getByPlaceholderText('What are we doing?'), {
      target: { value: 'Museum and café' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(handlers.updateActivity).toHaveBeenCalledWith(
        'museum',
        expect.objectContaining({ title: 'Museum and café' })
      )
    );
    expect(handlers.addActivity).not.toHaveBeenCalled();
  });
  test('can plan a trip length without choosing calendar dates', async () => {
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ totalDurationDays: null, destinations: [] })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Set trip length' }));
    fireEvent.change(screen.getByLabelText('Trip length in days'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save trip length' }));
    await waitFor(() =>
      expect(handlers.updateTrip).toHaveBeenCalledWith(
        expect.objectContaining({ duration: { totalDays: 3 } })
      )
    );
  });
  test('requires explicit confirmation inside the panel before deleting a plan', async () => {
    handlers.removeActivity.mockResolvedValue(true);
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ destinations: [destination({ activities: [plannerActivity()] })] })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit Explore the tile museum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Explore the tile museum' }));
    expect(handlers.removeActivity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep plan' }));
    expect(handlers.removeActivity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Explore the tile museum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove plan' }));
    await waitFor(() => expect(handlers.removeActivity).toHaveBeenCalledWith('museum'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
