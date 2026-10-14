import type { Id } from '@groam/backend/data-model';
import { stubPopoverEnvironment } from '@groam/ui/lib/stub-popover-environment';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { plannerActivity } from '@/testing/trip-planner-fixture';
import { TripDestinationsPanel } from './trip-destinations-panel';

const media = vi.hoisted(() => ({ upload: vi.fn() }));

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
  useMediaUpload: () => media.upload
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

function dayCard(day: number) {
  return screen.getByRole('region', { name: `Day ${day} schedule` });
}

function addOnDay(day: number, kind: 'Activity' | 'Stay' | 'Travel' | 'Destination') {
  fireEvent.keyDown(within(dayCard(day)).getByRole('button', { name: 'Add to day' }), {
    key: 'Enter'
  });
  fireEvent.click(screen.getByRole('menuitem', { name: kind }));
}

function addActivityOnDay(day: number) {
  addOnDay(day, 'Activity');
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
    expect(dayCard(1)).toBeTruthy();
    expect(dayCard(2)).toBeTruthy();
    expect(within(dayCard(1)).getByRole('button', { name: 'Add to day' })).toBeTruthy();
    expect(within(dayCard(2)).getByRole('button', { name: 'Add to day' })).toBeTruthy();
    addActivityOnDay(1);
    expect(screen.getByRole('region', { name: 'Add an activity to Day 1' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Day 1 schedule' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Day 2 schedule' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Choose a day' })).toBeNull();
    expect(screen.queryByRole('tablist', { name: 'Planning tools' })).toBeNull();
    expect(handlers.updateTrip).not.toHaveBeenCalled();
    expect(handlers.updateDestination).not.toHaveBeenCalled();
  });
  test('does not close a different day when an earlier activity save finishes', async () => {
    let finishSave: (saved: boolean) => void = () => undefined;
    handlers.addActivity.mockImplementation(
      () => new Promise<boolean>((resolve) => (finishSave = resolve))
    );
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);

    addActivityOnDay(1);
    fireEvent.change(screen.getByTestId(testIds.activityTitle), {
      target: { value: 'Morning market' }
    });
    fireEvent.click(screen.getByTestId(testIds.activitySubmit));
    await waitFor(() => expect(handlers.addActivity).toHaveBeenCalledOnce());

    addActivityOnDay(2);
    fireEvent.change(screen.getByTestId(testIds.activityTitle), {
      target: { value: 'Afternoon walk' }
    });
    await act(async () => {
      finishSave(true);
    });

    expect(screen.getByRole('region', { name: 'Add an activity to Day 2' })).toBeTruthy();
    expect((screen.getByTestId(testIds.activityTitle) as HTMLInputElement).value).toBe(
      'Afternoon walk'
    );
  });

  test('locks the destination while an inline activity save is pending', async () => {
    let finishSave: (saved: boolean) => void = () => undefined;
    handlers.addActivity.mockImplementation(
      () => new Promise<boolean>((resolve) => (finishSave = resolve))
    );
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({
          destinations: [
            destination(),
            destination({
              id: id<'tripDestinations'>('destination-porto'),
              name: 'Porto',
              position: 1
            })
          ]
        })}
      />
    );

    addActivityOnDay(1);
    const destinationSelect = screen.getByRole('combobox', { name: 'Destination' });
    expect(destinationSelect).toHaveProperty('disabled', false);
    fireEvent.change(screen.getByTestId(testIds.activityTitle), {
      target: { value: 'Morning market' }
    });
    fireEvent.click(screen.getByTestId(testIds.activitySubmit));
    await waitFor(() => expect(handlers.addActivity).toHaveBeenCalledOnce());
    expect(destinationSelect).toHaveProperty('disabled', true);

    await act(async () => {
      finishSave(true);
    });
  });

  test('keeps the inline draft mounted until its attachment upload completes', async () => {
    let finishUpload: (id: string) => void = () => undefined;
    media.upload.mockImplementation(
      () => new Promise<string>((resolve) => (finishUpload = resolve))
    );
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);

    addActivityOnDay(1);
    fireEvent.click(screen.getByTestId(testIds.activityMoreOptions));
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(['ticket'], 'ticket.pdf', { type: 'application/pdf' })] }
    });
    const otherDay = within(dayCard(2)).getByRole('button', { name: 'Add to day' });
    await waitFor(() => expect(otherDay).toHaveProperty('disabled', true));
    fireEvent.click(otherDay);
    expect(screen.getByRole('region', { name: 'Add an activity to Day 1' })).toBeTruthy();

    await act(async () => {
      finishUpload('media-ticket');
    });
    expect(screen.getByText('ticket.pdf')).toBeTruthy();
    expect(otherDay).toHaveProperty('disabled', false);
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
    fireEvent.click(screen.getByRole('button', { name: 'Manage Porto for Day 3' }));
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
  test('adds an activity on its day through the existing action', async () => {
    handlers.addActivity.mockResolvedValue(true);
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);
    addActivityOnDay(2);
    fireEvent.change(screen.getByPlaceholderText('What are we doing?'), {
      target: { value: 'Museum visit' }
    });
    fireEvent.click(screen.getByTestId(testIds.activitySubmit));
    await waitFor(() =>
      expect(handlers.addActivity).toHaveBeenCalledWith(
        'destination-lisbon',
        expect.objectContaining({
          title: 'Museum visit',
          schedule: expect.objectContaining({ day: 2 })
        })
      )
    );
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Add an activity to Day 2' })).toBeNull()
    );
  });
  test('allows plans before a trip duration has been chosen', () => {
    render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ totalDurationDays: null })}
      />
    );
    addActivityOnDay(1);
    expect(screen.getByTestId(testIds.activitySubmit)).toBeTruthy();
  });
  test('starts a stay on the chosen day using the shared stay form', async () => {
    handlers.addStay.mockResolvedValue(true);
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);
    addOnDay(2, 'Stay');
    expect(screen.getByRole('region', { name: 'Add stay' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Property or stay name' }), {
      target: { value: 'Riverside rooms' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save stay' }));
    await waitFor(() =>
      expect(handlers.addStay).toHaveBeenCalledWith(
        'destination-lisbon',
        expect.objectContaining({
          title: 'Riverside rooms',
          schedule: expect.objectContaining({ checkInDay: 2 })
        })
      )
    );
  });
  test('adds travel for a specific connection from the day card', async () => {
    handlers.setBoundaryTransfer.mockResolvedValue(true);
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);
    addOnDay(1, 'Travel');
    fireEvent.click(screen.getByRole('button', { name: 'Getting to Lisbon' }));
    expect(screen.getByRole('region', { name: 'Add travel' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save travel' }));
    await waitFor(() =>
      expect(handlers.setBoundaryTransfer).toHaveBeenCalledWith(
        'arrival',
        expect.objectContaining({ mode: 'train' })
      )
    );
  });
  test('offers destination creation from each day menu', () => {
    render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />);
    addOnDay(2, 'Destination');
    expect(handlers.onAddDestination).toHaveBeenCalledOnce();
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
