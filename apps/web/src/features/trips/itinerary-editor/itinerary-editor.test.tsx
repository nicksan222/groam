import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ItineraryEditor } from '@/features/trips/itinerary-editor/itinerary-editor';
import { testIds } from '@/lib/test-ids';
import type {
  Destination,
  TripActivity,
  TripDestinationActivityInput,
  TripDetail
} from '@/types/trips';

function plannerActivity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    id: 'museum',
    sourceId: null,
    title: 'Explore the tile museum',
    dayNumber: 1,
    endDayNumber: 1,
    startTime: '10:00',
    endTime: '12:00',
    timeBlock: 'morning',
    address: 'Lisbon, Portugal',
    notes: 'Leave a little time for the courtyard café.',
    costAmount: 8,
    costSplit: 'per_person',
    attachments: [],
    transferToNext: null,
    ...overrides
  } as TripActivity;
}

function plannerDestination(overrides: Partial<Destination> = {}): Destination {
  return {
    id: 'lisbon',
    sourceId: null,
    name: 'Lisbon',
    startDay: 1,
    endDay: 2,
    activities: [],
    stays: [],
    transferToNext: null,
    latitude: 38.72,
    longitude: -9.14,
    placeId: 'lisbon',
    position: 0,
    coverUrl: null,
    coverStatus: null,
    dayNotes: null,
    ...overrides
  } as Destination;
}

/** Calls the stateful editor made, so tests can assert what was (not) saved. */
const itineraryCalls = {
  addActivity: vi.fn(),
  removeActivity: vi.fn(),
  updateActivity: vi.fn()
};

/** A seven-day idea whose stops cover the given days; nothing is planned yet. */
function itineraryTrip(
  stops: Array<{ activities?: TripActivity[]; endDay: number; name: string; startDay: number }>,
  totalDurationDays = 7
): TripDetail {
  const destinations = stops.map((stop, index) =>
    plannerDestination({
      activities: stop.activities ?? [],
      endDay: stop.endDay,
      id: `stop-${stop.name.toLowerCase()}` as Destination['id'],
      name: stop.name,
      position: index,
      startDay: stop.startDay,
      stays: [],
      transferToNext: null
    })
  );
  return {
    arrivalTransfer: null,
    currency: 'EUR',
    departureTransfer: null,
    destinations,
    id: 'trip-idea',
    name: 'Idea',
    permissions: { canEdit: true, canPropose: true },
    proposal: null,
    startDate: null,
    totalDurationDays
  } as unknown as TripDetail;
}

function plannedActivity({
  id,
  ...overrides
}: Omit<Partial<TripActivity>, 'id'> & { id: string; title: string }) {
  return plannerActivity({
    id: id as TripActivity['id'],
    address: null,
    costAmount: null,
    endTime: null,
    notes: null,
    startTime: null,
    timeBlock: 'morning',
    ...overrides
  });
}

function activityFromInput(input: TripDestinationActivityInput, id: string): TripActivity {
  return plannedActivity({
    address: input.address ?? null,
    dayNumber: input.schedule.day,
    endDayNumber: input.schedule.endDay ?? input.schedule.day,
    id,
    notes: input.notes ?? null,
    timeBlock: input.schedule.timeBlock,
    title: input.title
  });
}

const succeed = () => Promise.resolve(true);

/** The itinerary editor wired to in-memory activity actions that update the trip like the backend. */
function StatefulItineraryEditor({
  initial,
  standalone = true
}: {
  initial: TripDetail;
  /** False when a trip page shell already surrounds the editor. */
  standalone?: boolean;
}) {
  const [trip, setTrip] = useState(initial);
  const [nextId, setNextId] = useState(1);
  const mapStops = (change: (stop: Destination) => Destination) =>
    setTrip((current) => ({ ...current, destinations: current.destinations.map(change) }));
  const activityActions = {
    addActivity: (destinationId: Id<'tripDestinations'>, input: TripDestinationActivityInput) => {
      itineraryCalls.addActivity(destinationId, input);
      const added = activityFromInput(input, `new-${nextId}`);
      setNextId(nextId + 1);
      mapStops((stop) =>
        stop.id === destinationId ? { ...stop, activities: [...stop.activities, added] } : stop
      );
      return succeed();
    },
    removeActivity: (activityId: Id<'tripDestinationActivities'>) => {
      itineraryCalls.removeActivity(activityId);
      mapStops((stop) => ({
        ...stop,
        activities: stop.activities.filter((activity) => activity.id !== activityId)
      }));
      return succeed();
    },
    reorderActivities: succeed,
    removeActivityTransfer: succeed,
    removeBoundaryTransfer: succeed,
    removeDestinationTransfer: succeed,
    setActivityTransfer: succeed,
    setBoundaryTransfer: succeed,
    setDestinationTransfer: succeed,
    updateActivity: (
      activityId: Id<'tripDestinationActivities'>,
      input: TripDestinationActivityInput
    ) => {
      itineraryCalls.updateActivity(activityId, input);
      mapStops((stop) => ({
        ...stop,
        activities: stop.activities.map((activity) =>
          activity.id === activityId ? activityFromInput(input, activityId) : activity
        )
      }));
      return succeed();
    }
  };
  const editor = (
    <ItineraryEditor
      activityActions={activityActions}
      moveDestination={succeed}
      onOpenOverview={() => undefined}
      removeDestination={succeed}
      stayActions={{ addStay: succeed, removeStay: succeed, updateStay: succeed }}
      trip={trip}
      updateDestination={succeed}
      updateTrip={succeed}
    />
  );
  // The trip page turns off the section reveal animation; without it every first click waits for it.
  return standalone ? <div className="trip-page-shell">{editor}</div> : editor;
}

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const day = (number: number) => page.getByRole('region', { name: `Day ${number} schedule` });
const editor = () => page.getByRole('region', { name: /^(?:Add an activity to|Edit) /u });
const dayCell = (scope: ReturnType<typeof editor>, number: number) =>
  scope.getByRole('button', { name: new RegExp(`^Day ${number}(?:,|$)`, 'u') });

async function openAddMenu(number: number) {
  await day(number).getByRole('button', { name: 'Add to day' }).click();
}

async function startActivity(number: number) {
  await openAddMenu(number);
  await page.getByRole('menuitem', { name: 'Activity' }).click();
}

describe('day headers', () => {
  test.each([
    [4, 'Porto'],
    [5, 'Porto'],
    [6, 'Braga']
  ])('Day %i names the destination it is spent in', async (number, name) => {
    await render(
      <StatefulItineraryEditor
        initial={itineraryTrip([
          { endDay: 5, name: 'Porto', startDay: 4 },
          { endDay: 6, name: 'Braga', startDay: 6 }
        ])}
      />
    );
    await expect
      .element(day(number).getByRole('button', { name: `Manage ${name} for Day ${number}` }))
      .toBeVisible();
    await expect.element(day(number).getByRole('heading', { name: `Day ${number}` })).toBeVisible();
  });

  test('an unplanned day invites a destination instead of naming one', async () => {
    await render(
      <StatefulItineraryEditor
        initial={itineraryTrip([{ endDay: 5, name: 'Porto', startDay: 4 }])}
      />
    );
    expect(day(2).element().textContent).toContain('Add a destination to start planning this day.');
  });
});

describe('adding activities from later days', () => {
  test.each([1, 2, 3])(
    'Day %i has no destination, so it cannot take an activity',
    async (number) => {
      await render(
        <StatefulItineraryEditor
          initial={itineraryTrip([{ endDay: 5, name: 'Porto', startDay: 4 }])}
        />
      );
      await openAddMenu(number);
      await expect.element(page.getByRole('menuitem', { name: 'Activity' })).toBeDisabled();
      await expect.element(page.getByRole('menuitem', { name: 'Stay' })).toBeDisabled();
      await expect.element(page.getByRole('menuitem', { name: 'Destination' })).toBeEnabled();
    }
  );

  test.each([4, 5])('Day %i hosts the destination and opens the inline form', async (number) => {
    await render(
      <StatefulItineraryEditor
        initial={itineraryTrip([{ endDay: 5, name: 'Porto', startDay: 4 }])}
      />
    );
    await startActivity(number);
    await expect
      .element(editor())
      .toHaveAttribute('aria-label', `Add an activity to Day ${number}`);
    await expect.element(editor().getByRole('button', { name: 'Add to day' })).toBeDisabled();
    expect(editor().element().textContent).toContain(`Day ${number} · Porto`);
  });

  test('adds, edits, round-trips the address and removes a later-day activity', async () => {
    await render(
      <StatefulItineraryEditor
        initial={itineraryTrip([{ endDay: 5, name: 'Porto', startDay: 4 }])}
      />
    );
    await startActivity(4);
    await editor().getByTestId(testIds.activityTitle).fill('Porto river walk');
    await editor().getByRole('button', { name: 'Add to day' }).click();
    await expect.element(editor()).not.toBeInTheDocument();
    await expect
      .element(day(4).getByRole('button', { name: 'Edit Porto river walk' }))
      .toBeVisible();
    expect(itineraryCalls.addActivity).toHaveBeenCalledOnce();

    await day(4).getByRole('button', { name: 'Edit Porto river walk' }).click();
    await editor().getByTestId(testIds.activityAddress).fill('Ribeira, Porto');
    await editor().getByRole('button', { name: 'Save changes' }).click();
    await expect.element(editor()).not.toBeInTheDocument();

    await day(4).getByRole('button', { name: 'Edit Porto river walk' }).click();
    await expect
      .element(editor().getByTestId(testIds.activityAddress))
      .toHaveValue('Ribeira, Porto');
    await editor().getByRole('button', { name: 'Remove Porto river walk' }).click();
    await editor().getByRole('button', { name: 'Remove plan' }).click();
    await expect
      .element(page.getByRole('button', { name: 'Edit Porto river walk' }))
      .not.toBeInTheDocument();

    await startActivity(5);
    await editor().getByTestId(testIds.activityTitle).fill('Evening cruise');
    await editor().getByRole('button', { name: 'Add to day' }).click();
    await expect.element(day(5).getByRole('button', { name: 'Edit Evening cruise' })).toBeVisible();
  });
});

describe('cancelling an edit', () => {
  const boatTrip = () =>
    itineraryTrip([
      {
        activities: [
          plannedActivity({
            address: 'Original meeting point',
            dayNumber: 1,
            endDayNumber: 1,
            id: 'boat',
            title: 'Boat trip'
          })
        ],
        endDay: 3,
        name: 'Porto',
        startDay: 1
      }
    ]);

  test.each(['Cancel', 'Close activity editor'])(
    '%s discards unsaved changes and leaves the saved plan untouched',
    async (control) => {
      await render(<StatefulItineraryEditor initial={boatTrip()} />);
      await page.getByRole('button', { name: 'Edit Boat trip' }).click();
      await editor().getByTestId(testIds.activityAddress).fill('Unsaved meeting point');
      await editor().getByRole('button', { name: control }).click();
      await expect.element(editor()).not.toBeInTheDocument();
      expect(itineraryCalls.updateActivity).not.toHaveBeenCalled();

      await page.getByRole('button', { name: 'Edit Boat trip' }).click();
      await expect
        .element(editor().getByTestId(testIds.activityAddress))
        .toHaveValue('Original meeting point');
    }
  );

  test('asks before removing and keeps the plan when declined', async () => {
    await render(<StatefulItineraryEditor initial={boatTrip()} />);
    await page.getByRole('button', { name: 'Edit Boat trip' }).click();
    await expect
      .element(editor().getByRole('button', { name: 'Remove plan' }))
      .not.toBeInTheDocument();
    await editor().getByRole('button', { name: 'Remove Boat trip' }).click();
    await expect.element(editor().getByRole('button', { name: 'Remove plan' })).toBeVisible();
    expect(editor().element().textContent).toContain('Remove Boat trip from this idea?');
    await editor().getByRole('button', { name: 'Keep plan' }).click();
    await expect
      .element(editor().getByRole('button', { name: 'Remove plan' }))
      .not.toBeInTheDocument();
    await editor().getByRole('button', { name: 'Cancel' }).click();
    await expect.element(editor()).not.toBeInTheDocument();
    expect(itineraryCalls.removeActivity).not.toHaveBeenCalled();
    await expect.element(page.getByRole('button', { name: 'Edit Boat trip' })).toBeVisible();
  });

  test('removes the plan only after the confirmation', async () => {
    await render(<StatefulItineraryEditor initial={boatTrip()} />);
    await page.getByRole('button', { name: 'Edit Boat trip' }).click();
    await editor().getByRole('button', { name: 'Remove Boat trip' }).click();
    await editor().getByRole('button', { name: 'Remove plan' }).click();
    await expect
      .element(page.getByRole('button', { name: 'Edit Boat trip' }))
      .not.toBeInTheDocument();
    expect(itineraryCalls.removeActivity).toHaveBeenCalledOnce();
  });
});

describe('multi-day activities', () => {
  const festival = () =>
    itineraryTrip([
      {
        activities: [
          plannedActivity({
            dayNumber: 4,
            endDayNumber: 6,
            id: 'festival',
            timeBlock: 'full_day',
            title: 'Three-day festival'
          })
        ],
        endDay: 6,
        name: 'Porto',
        startDay: 4
      }
    ]);

  test.each([4, 5, 6])('Day %i lists the activity and opens the whole range', async (number) => {
    await render(<StatefulItineraryEditor initial={festival()} />);
    await expect.element(day(number).getByText('Three-day festival')).toBeVisible();
    await day(number).getByRole('button', { name: 'Edit Three-day festival' }).click();
    expect(editor().element().textContent).toContain('Days 4–6 · Porto');
    await expect
      .element(editor().getByTestId(testIds.activityTitle))
      .toHaveValue('Three-day festival');
    await expect.element(editor().getByRole('button', { name: 'Save changes' })).toBeEnabled();
    await expect.element(dayCell(editor(), 4)).toHaveAttribute('aria-pressed', 'true');
    await expect.element(dayCell(editor(), 6)).toHaveAttribute('aria-pressed', 'true');
  });

  test('saving from a continuation day keeps the full range', async () => {
    await render(<StatefulItineraryEditor initial={festival()} />);
    await day(6).getByRole('button', { name: 'Edit Three-day festival' }).click();
    await editor().getByTestId(testIds.activityAddress).fill('Praça da Liberdade');
    await editor().getByRole('button', { name: 'Save changes' }).click();
    expect(itineraryCalls.updateActivity).toHaveBeenCalledWith(
      'festival',
      expect.objectContaining({
        address: 'Praça da Liberdade',
        schedule: expect.objectContaining({ day: 4, endDay: 6 })
      })
    );
  });
});

describe('inline day planning', () => {
  const lisbon = () => itineraryTrip([{ endDay: 3, name: 'Lisbon', startDay: 1 }]);

  async function addInline(number: number, title: string, period: string) {
    await startActivity(number);
    await editor().getByTestId(testIds.activityTitle).fill(title);
    const choice = editor().getByRole('button', { name: period });
    await choice.click();
    await expect.element(choice).toHaveAttribute('aria-pressed', 'true');
    await editor().getByRole('button', { name: 'Add to day' }).click();
    await expect.element(editor()).not.toBeInTheDocument();
  }

  test('lists untimed plans in the order they were added, morning then afternoon', async () => {
    await render(<StatefulItineraryEditor initial={lisbon()} />);
    await addInline(2, 'Market breakfast', 'Morning');
    await addInline(2, 'Riverside stroll', 'Afternoon');

    const plans = day(2).getByRole('button', {
      name: /^Edit (?:Market breakfast|Riverside stroll)$/u
    });
    await expect.poll(() => plans.elements()).toHaveLength(2);
    await expect.element(plans.first()).toHaveAccessibleName('Edit Market breakfast');
    await expect.element(plans.last()).toHaveAccessibleName('Edit Riverside stroll');
  });

  test('orders timed plans by start time regardless of insertion order', async () => {
    await render(
      <StatefulItineraryEditor
        initial={itineraryTrip([
          {
            activities: [
              plannedActivity({
                dayNumber: 2,
                endDayNumber: 2,
                id: 'late',
                startTime: '15:00',
                timeBlock: 'afternoon',
                title: 'Riverside stroll'
              }),
              plannedActivity({
                dayNumber: 2,
                endDayNumber: 2,
                id: 'early',
                startTime: '09:00',
                title: 'Market breakfast'
              })
            ],
            endDay: 3,
            name: 'Lisbon',
            startDay: 1
          }
        ])}
      />
    );
    const plans = day(2).getByRole('button', {
      name: /^Edit (?:Market breakfast|Riverside stroll)$/u
    });
    await expect.element(plans.first()).toHaveAccessibleName('Edit Market breakfast');
    await expect.element(plans.last()).toHaveAccessibleName('Edit Riverside stroll');
  });

  test('reopens a plan on its time of day and saves an address', async () => {
    await render(<StatefulItineraryEditor initial={lisbon()} />);
    await addInline(2, 'Riverside stroll', 'Afternoon');
    await day(2).getByRole('button', { name: 'Edit Riverside stroll' }).click();
    await expect.element(editor()).toHaveAttribute('aria-label', 'Edit Riverside stroll');
    await expect
      .element(editor().getByRole('button', { name: 'Afternoon' }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect
      .element(editor().getByRole('button', { name: 'Morning' }))
      .toHaveAttribute('aria-pressed', 'false');
    await editor().getByTestId(testIds.activityAddress).fill('Ribeira das Naus, Lisbon');
    await editor().getByRole('button', { name: 'Save changes' }).click();
    await expect.element(editor()).not.toBeInTheDocument();
    await expect
      .element(day(2).getByRole('button', { name: 'Edit Riverside stroll' }))
      .toBeVisible();
  });

  test('keeps notes behind "More options" until asked for', async () => {
    await render(<StatefulItineraryEditor initial={lisbon()} />);
    await startActivity(2);
    await expect.element(editor().getByTestId(testIds.activityNotes)).not.toBeVisible();
    await editor()
      .getByText(/More options/u)
      .click();
    await expect.element(editor().getByTestId(testIds.activityNotes)).toBeVisible();
  });

  test('offers a destination choice only on a day shared by several stops', async () => {
    await render(<StatefulItineraryEditor initial={lisbon()} />);
    await startActivity(2);
    await expect
      .element(editor().getByRole('combobox', { name: 'Destination' }))
      .not.toBeInTheDocument();
  });

  test('switching a shared day’s destination keeps the draft and resets days outside it', async () => {
    await render(
      <StatefulItineraryEditor
        initial={itineraryTrip([
          { endDay: 2, name: 'Lisbon', startDay: 1 },
          { endDay: 4, name: 'Porto', startDay: 2 }
        ])}
      />
    );
    await startActivity(2);
    await editor().getByTestId(testIds.activityTitle).fill('Riverside picnic');
    await editor().getByRole('button', { name: 'Afternoon' }).click();
    await editor()
      .getByText(/More options/u)
      .click();
    await dayCell(editor(), 1).click();
    await dayCell(editor(), 2).click();
    await expect.element(dayCell(editor(), 1)).toHaveAttribute('aria-pressed', 'true');

    await editor().getByRole('combobox', { name: 'Destination' }).click();
    await page.getByRole('option', { name: 'Porto' }).click();
    await expect
      .element(editor().getByTestId(testIds.activityTitle))
      .toHaveValue('Riverside picnic');
    await expect
      .element(editor().getByRole('button', { name: 'Afternoon' }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect.element(dayCell(editor(), 2)).toHaveAttribute('aria-pressed', 'true');
    await expect.element(dayCell(editor(), 1)).toHaveAttribute('aria-pressed', 'false');
    await expect.element(dayCell(editor(), 1)).toBeDisabled();

    await editor().getByTestId(testIds.activityNotes).fill('Meet by the old bridge');
    await editor().getByRole('button', { name: 'Add to day' }).click();
    const row = day(2)
      .getByRole('button', { name: 'Edit Riverside picnic' })
      .element()
      .closest('li');
    expect(row?.textContent).toContain('Porto');
  });

  test('keeps the inline form inside the schedule on a phone without overflow', async () => {
    await useViewport(390, 844);
    await render(
      <StatefulItineraryEditor
        initial={itineraryTrip([{ endDay: 3, name: 'Porto', startDay: 2 }])}
      />
    );
    await expect.element(day(2).getByRole('button', { name: 'Add to day' })).toBeVisible();
    await addInline(2, 'Morning market', 'Morning');
    await expect.element(day(2).getByRole('button', { name: 'Edit Morning market' })).toBeVisible();
    await startActivity(3);
    await expect
      .element(day(3).getByRole('region', { name: 'Add an activity to Day 3' }))
      .toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );
  });
});
