import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ItineraryEditor } from '@/features/trips/itinerary-editor/itinerary-editor';
import { ChangeSummary } from '@/features/trips/trip-versions/change-summary';
import type {
  Destination,
  TripActivity,
  TripDestinationActivityInput,
  TripDetail
} from '@/types/trips';
import { TripPageShell } from './trip-page-shell';

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

type Tab = 'compare' | 'itinerary' | 'overview';

function TwoColumnBody({ children }: { children?: ReactNode }) {
  return (
    <Shell.TwoColumns>
      <Shell.LeftColumn>{children ?? <p>Main column</p>}</Shell.LeftColumn>
      <Shell.RightColumn>
        <p>Supporting column</p>
      </Shell.RightColumn>
    </Shell.TwoColumns>
  );
}

const bodies = {
  compare: () => (
    <TwoColumnBody>
      <ChangeSummary
        changes={[
          {
            change: 'added',
            entity: 'activity',
            fields: [],
            key: 'museum',
            label: 'Museum visit'
          }
        ]}
        status="draft"
      />
    </TwoColumnBody>
  ),
  itinerary: () => (
    <StatefulItineraryEditor
      initial={itineraryTrip([{ endDay: 3, name: 'Porto', startDay: 1 }])}
      standalone={false}
    />
  ),
  overview: () => <TwoColumnBody />
} satisfies Record<Tab, () => ReactNode>;

/** The trip page as the workspace shell frames it, showing the body of one tab. */
function TripPage({ tab }: { tab: Tab }) {
  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TripPageShell
          body={bodies[tab]()}
          hero={<h1>Coast week</h1>}
          nav={<nav aria-label="Trip sections" />}
        />
      </div>
    </SidebarProvider>
  );
}

function required<Element extends HTMLElement>(selector: string, root: ParentNode = document) {
  const element = root.querySelector<Element>(selector);
  if (!element) throw new Error(`Expected ${selector}`);
  return element;
}

/** Let the browser resolve semantic tokens and keywords the way it paints them. */
function resolvedBackground(value: string) {
  const probe = document.body.appendChild(document.createElement('span'));
  probe.style.backgroundColor = value;
  const resolved = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return resolved;
}

/** The painted canvas behind the page body, looking through transparent wrappers. */
function pageCanvas() {
  const body = required('[data-slot="trip-board-area"]');
  const clear = resolvedBackground('transparent');
  let canvas: Element | null = body;
  while (canvas && getComputedStyle(canvas).backgroundColor === clear)
    canvas = canvas.parentElement;
  const frame = body.getBoundingClientRect();
  return {
    background: canvas ? getComputedStyle(canvas).backgroundColor : clear,
    overflow: body.scrollWidth > body.clientWidth,
    padding: getComputedStyle(body).padding,
    width: Math.round(frame.width)
  };
}

function twoColumnLayout() {
  const body = required('[data-slot="trip-board-area"]');
  const grid = required('[data-slot="shell-two-columns"]', body);
  const frame = body.getBoundingClientRect();
  const primary = required('[data-slot="shell-left-column"]', grid).getBoundingClientRect();
  const secondary = required('[data-slot="shell-right-column"]', grid).getBoundingClientRect();
  return {
    columns: getComputedStyle(grid).gridTemplateColumns,
    gap: getComputedStyle(grid).gap,
    leftInset: Math.round(primary.left - frame.left),
    padding: getComputedStyle(body).padding,
    rightWidth: Math.round(secondary.width),
    stacked: secondary.top >= primary.bottom,
    topInset: Math.round(primary.top - frame.top)
  };
}

const pageOverflows = () =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth;

beforeEach(() => {
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('supporting column', () => {
  // Trip pages size the supporting column from the trip workspace container (18rem = 288px).
  test.each([
    [1440, false],
    [1024, false],
    [1023, true],
    [390, true]
  ])('at %ipx wide the column stacked is %s', async (width, stacked) => {
    await useViewport(width, 1000);
    await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const layout = twoColumnLayout();
    expect(layout.stacked).toBe(stacked);
    if (!stacked) expect(layout.rightWidth).toBe(288);
    expect(pageCanvas().overflow).toBe(false);
    expect(pageOverflows()).toBe(false);
  });

  test.each([1440, 1024, 390])(
    'the comparison tab lays out exactly like the overview at %ipx',
    async (width) => {
      await useViewport(width, 1000);
      const view = await render(<TripPage tab="overview" />);
      await expect.element(page.getByText('Supporting column')).toBeVisible();
      const overview = { canvas: pageCanvas(), layout: twoColumnLayout() };
      await view.rerender(<TripPage tab="compare" />);
      await expect.element(page.getByText('Museum visit')).toBeVisible();
      expect({ canvas: pageCanvas(), layout: twoColumnLayout() }).toEqual(overview);
    }
  );
});

describe('itinerary tab', () => {
  test.each([1440, 1024, 390])(
    'uses the full body width without a supporting column at %ipx',
    async (width) => {
      await useViewport(width, 1000);
      await render(<TripPage tab="itinerary" />);
      await expect.element(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
      await expect.element(page.getByText('Supporting column')).not.toBeInTheDocument();
      const body = required('[data-slot="trip-board-area"]');
      const style = getComputedStyle(body);
      const available = Math.round(
        body.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight)
      );
      const section = page.getByRole('region', { name: 'Itinerary editor' }).element();
      expect(Math.round(section.getBoundingClientRect().width)).toBe(available);
      expect(pageOverflows()).toBe(false);
    }
  );

  test('shares the overview canvas', async () => {
    const view = await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const overview = pageCanvas();
    await view.rerender(<TripPage tab="itinerary" />);
    await expect.element(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
    expect(pageCanvas()).toEqual(overview);
  });
});

describe('page canvas', () => {
  test.each([
    ['light', false, 1440],
    ['light', false, 390],
    ['dark', true, 1440],
    ['dark', true, 390]
  ])('every tab paints the canvas token in %s mode at %ipx', async (_mode, dark, width) => {
    document.documentElement.classList.toggle('dark', dark);
    await useViewport(width, 1000);
    const view = await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const overview = pageCanvas();
    expect(overview.overflow).toBe(false);
    expect(overview.background).toBe(resolvedBackground('var(--canvas)'));
    // The workspace wrapper stays transparent so the canvas shows through.
    expect(getComputedStyle(required('[data-slot="sidebar-wrapper"]')).backgroundColor).toBe(
      resolvedBackground('transparent')
    );

    await view.rerender(<TripPage tab="itinerary" />);
    await expect.element(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
    expect(pageCanvas()).toEqual(overview);
    await view.rerender(<TripPage tab="compare" />);
    await expect.element(page.getByText('Museum visit')).toBeVisible();
    expect(pageCanvas()).toEqual(overview);
  });

  test('the dark canvas differs from the light canvas', async () => {
    const view = await render(<TripPage tab="overview" />);
    await expect.element(page.getByText('Supporting column')).toBeVisible();
    const light = pageCanvas().background;
    document.documentElement.classList.add('dark');
    await view.rerender(<TripPage tab="overview" />);
    expect(pageCanvas().background).not.toBe(light);
  });
});
