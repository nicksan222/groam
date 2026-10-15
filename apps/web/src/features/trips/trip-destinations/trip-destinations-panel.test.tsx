import type { Id } from '@groam/backend/data-model';
import { act, render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
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

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
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
  return page.getByRole('region', { name: `Day ${day} schedule` });
}

async function addOnDay(day: number, kind: 'Activity' | 'Stay' | 'Travel' | 'Destination') {
  await dayCard(day).getByRole('button', { name: 'Add to day' }).click();
  await page.getByRole('menuitem', { name: kind }).click();
}

async function addActivityOnDay(day: number) {
  await addOnDay(day, 'Activity');
}

beforeEach(() => {
  vi.clearAllMocks();
  versions.proposal = undefined;
  versions.proposals = [];
});

describe('TripDestinationsPanel day editor', () => {
  test('keeps shared plans read-only', async () => {
    const trip = tripDetail({ proposal: null });
    trip.permissions.canEdit = false;
    await render(<TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={trip} />);
    await expect.element(page.getByRole('heading', { name: 'Day 1' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Add a plan' })).not.toBeInTheDocument();
    await expect.element(page.getByLabelText('Itinerary editor')).not.toBeInTheDocument();
  });
  test('gives an empty idea one clear starting action', async () => {
    await render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ destinations: [] })}
      />
    );
    await expect.element(page.getByText('A place to start. A day to fill.')).toBeInTheDocument();
    await page.getByRole('button', { name: 'Add first destination' }).click();
    expect(handlers.onAddDestination).toHaveBeenCalledOnce();
  });
  test('shows every day without a redundant day picker', async () => {
    await render(
      <TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />
    );
    await expect.element(dayCard(1)).toBeInTheDocument();
    await expect.element(dayCard(2)).toBeInTheDocument();
    await expect
      .element(dayCard(1).getByRole('button', { name: 'Add to day' }))
      .toBeInTheDocument();
    await expect
      .element(dayCard(2).getByRole('button', { name: 'Add to day' }))
      .toBeInTheDocument();
    await addActivityOnDay(1);
    await expect
      .element(page.getByRole('region', { name: 'Add an activity to Day 1' }))
      .toBeInTheDocument();
    await expect.element(page.getByRole('region', { name: 'Day 1 schedule' })).toBeInTheDocument();
    await expect.element(page.getByRole('region', { name: 'Day 2 schedule' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Choose a day' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('tablist', { name: 'Planning tools' }))
      .not.toBeInTheDocument();
    expect(handlers.updateTrip).not.toHaveBeenCalled();
    expect(handlers.updateDestination).not.toHaveBeenCalled();
  });
  test('does not close a different day when an earlier activity save finishes', async () => {
    let finishSave: (saved: boolean) => void = () => undefined;
    handlers.addActivity.mockImplementation(
      () => new Promise<boolean>((resolve) => (finishSave = resolve))
    );
    await render(
      <TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />
    );

    await addActivityOnDay(1);
    await page.getByTestId(testIds.activityTitle).fill('Morning market');
    await page.getByTestId(testIds.activitySubmit).click();
    await vi.waitFor(() => expect(handlers.addActivity).toHaveBeenCalledOnce());

    await addActivityOnDay(2);
    await page.getByTestId(testIds.activityTitle).fill('Afternoon walk');
    await act(() => {
      finishSave(true);
    });

    await expect
      .element(page.getByRole('region', { name: 'Add an activity to Day 2' }))
      .toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.activityTitle)).toHaveValue('Afternoon walk');
  });

  test('locks the destination while an inline activity save is pending', async () => {
    let finishSave: (saved: boolean) => void = () => undefined;
    handlers.addActivity.mockImplementation(
      () => new Promise<boolean>((resolve) => (finishSave = resolve))
    );
    await render(
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

    await addActivityOnDay(1);
    const destinationSelect = page.getByRole('combobox', { name: 'Destination' });
    await expect.element(destinationSelect).toBeEnabled();
    await page.getByTestId(testIds.activityTitle).fill('Morning market');
    await page.getByTestId(testIds.activitySubmit).click();
    await vi.waitFor(() => expect(handlers.addActivity).toHaveBeenCalledOnce());
    await expect.element(destinationSelect).toBeDisabled();

    await act(() => {
      finishSave(true);
    });
  });

  test('keeps the inline draft mounted until its attachment upload completes', async () => {
    let finishUpload: (id: string) => void = () => undefined;
    media.upload.mockImplementation(
      () => new Promise<string>((resolve) => (finishUpload = resolve))
    );
    await render(
      <TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />
    );

    await addActivityOnDay(1);
    await page.getByTestId(testIds.activityMoreOptions).click();
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Expected a ticket file input');
    await userEvent.upload(
      fileInput,
      new File(['ticket'], 'ticket.pdf', { type: 'application/pdf' })
    );
    const otherDay = dayCard(2).getByRole('button', { name: 'Add to day' });
    await expect.element(otherDay).toBeDisabled();
    // A real click waits for an enabled target; force it to prove the disabled day ignores it.
    await otherDay.click({ force: true });
    await expect
      .element(page.getByRole('region', { name: 'Add an activity to Day 1' }))
      .toBeInTheDocument();

    await act(() => {
      finishUpload('media-ticket');
    });
    await expect.element(page.getByText('ticket.pdf')).toBeInTheDocument();
    await expect.element(otherDay).toBeEnabled();
  });

  test('preserves occupied-day constraints in the selected route stop', async () => {
    await render(
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
    await page.getByRole('button', { name: 'Manage Porto for Day 3' }).click();
    await page.getByText('Schedule & notes').click();
    await expect
      .element(page.getByRole('button', { name: 'Day 1, Taken' }))
      .toHaveAttribute('data-taken');
  });
  test('preserves change highlights and removed items in the route summary', async () => {
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
    await render(
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
    await expect.element(page.getByText('Faro')).toBeInTheDocument();
  });
  test('adds an activity on its day through the existing action', async () => {
    handlers.addActivity.mockResolvedValue(true);
    await render(
      <TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />
    );
    await addActivityOnDay(2);
    await page.getByPlaceholder('What are we doing?').fill('Museum visit');
    await page.getByTestId(testIds.activitySubmit).click();
    await vi.waitFor(() =>
      expect(handlers.addActivity).toHaveBeenCalledWith(
        'destination-lisbon',
        expect.objectContaining({
          title: 'Museum visit',
          schedule: expect.objectContaining({ day: 2 })
        })
      )
    );
    await expect
      .element(page.getByRole('region', { name: 'Add an activity to Day 2' }))
      .not.toBeInTheDocument();
  });
  test('allows plans before a trip duration has been chosen', async () => {
    await render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ totalDurationDays: null })}
      />
    );
    await addActivityOnDay(1);
    await expect.element(page.getByTestId(testIds.activitySubmit)).toBeInTheDocument();
  });
  test('starts a stay on the chosen day using the shared stay form', async () => {
    handlers.addStay.mockResolvedValue(true);
    await render(
      <TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />
    );
    await addOnDay(2, 'Stay');
    await expect.element(page.getByRole('region', { name: 'Add stay' })).toBeInTheDocument();
    await page.getByRole('textbox', { name: 'Property or stay name' }).fill('Riverside rooms');
    await page.getByRole('button', { name: 'Save stay' }).click();
    await vi.waitFor(() =>
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
    await render(
      <TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />
    );
    await addOnDay(1, 'Travel');
    await page.getByRole('button', { name: 'Getting to Lisbon' }).click();
    await expect.element(page.getByRole('region', { name: 'Add travel' })).toBeInTheDocument();
    await page.getByRole('button', { name: 'Save travel' }).click();
    await vi.waitFor(() =>
      expect(handlers.setBoundaryTransfer).toHaveBeenCalledWith(
        'arrival',
        expect.objectContaining({ mode: 'train' })
      )
    );
  });
  test('offers destination creation from each day menu', async () => {
    await render(
      <TripDestinationsPanel {...handlers} addDestinationOpen={false} trip={tripDetail()} />
    );
    await addOnDay(2, 'Destination');
    expect(handlers.onAddDestination).toHaveBeenCalledOnce();
  });
  test('opens an existing plan and saves its identity without creating a duplicate', async () => {
    handlers.updateActivity.mockResolvedValue(true);
    await render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ destinations: [destination({ activities: [plannerActivity()] })] })}
      />
    );
    await page.getByRole('button', { name: 'Edit Explore the tile museum' }).click();
    await expect.element(page.getByLabelText('Start time (optional)')).toHaveValue('10:00');
    await page.getByPlaceholder('What are we doing?').fill('Museum and café');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await vi.waitFor(() =>
      expect(handlers.updateActivity).toHaveBeenCalledWith(
        'museum',
        expect.objectContaining({ title: 'Museum and café' })
      )
    );
    expect(handlers.addActivity).not.toHaveBeenCalled();
  });
  test('can plan a trip length without choosing calendar dates', async () => {
    await render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ totalDurationDays: null, destinations: [] })}
      />
    );
    await page.getByRole('button', { name: 'Set trip length' }).click();
    await page.getByLabelText('Trip length in days').fill('3');
    await page.getByRole('button', { name: 'Save trip length' }).click();
    await vi.waitFor(() =>
      expect(handlers.updateTrip).toHaveBeenCalledWith(
        expect.objectContaining({ duration: { totalDays: 3 } })
      )
    );
  });
  test('requires explicit confirmation inside the panel before deleting a plan', async () => {
    handlers.removeActivity.mockResolvedValue(true);
    await render(
      <TripDestinationsPanel
        {...handlers}
        addDestinationOpen={false}
        trip={tripDetail({ destinations: [destination({ activities: [plannerActivity()] })] })}
      />
    );
    await page.getByRole('button', { name: 'Edit Explore the tile museum' }).click();
    await page.getByRole('button', { name: 'Remove Explore the tile museum' }).click();
    expect(handlers.removeActivity).not.toHaveBeenCalled();
    await page.getByRole('button', { name: 'Keep plan' }).click();
    expect(handlers.removeActivity).not.toHaveBeenCalled();
    await page.getByRole('button', { name: 'Remove Explore the tile museum' }).click();
    await page.getByRole('button', { name: 'Remove plan' }).click();
    await vi.waitFor(() => expect(handlers.removeActivity).toHaveBeenCalledWith('museum'));
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  });
});
