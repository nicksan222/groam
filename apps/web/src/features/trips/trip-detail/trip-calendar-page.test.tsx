import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { plannerFixture } from '@/features/trips/testing/planner-fixtures';
import { jumpToDay } from '@/features/trips/trip-destinations/trip-jump-targets';
import { usePendingCalendarActivityStore } from '@/lib/stores/pending-calendar-activity-store';
import { testIds } from '@/lib/test-ids';
import { TripCalendarPage } from './trip-calendar-page';

vi.mock('@/features/media/hooks/use-media-upload', () => ({ useMediaUpload: () => vi.fn() }));

test('shows the whole plan on a calendar with trip days and no day cards', async () => {
  await render(<TripCalendarPage trip={plannerFixture()} />);
  await expect.element(page.getByTestId(testIds.tripCalendarPage)).toBeVisible();
  await expect.element(page.getByRole('region', { name: 'Calendar' })).toBeVisible();
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
  await expect.element(page.getByText('Day 3', { exact: true })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: /Explore the tile museum/ }).first())
    .toBeVisible();
  await expect.element(page.getByRole('region', { name: /^Day 1 / })).not.toBeInTheDocument();
});

test('opens a plan read-only, with its notes and nothing to edit', async () => {
  await render(<TripCalendarPage trip={plannerFixture()} />);
  await page
    .getByRole('button', { name: /Explore the tile museum/ })
    .first()
    .click();
  await expect.element(page.getByText('Leave a little time for the courtyard café.')).toBeVisible();
  await expect.element(page.getByRole('textbox', { name: 'Event title' })).not.toBeInTheDocument();
});

const frame = () => document.querySelector('[data-plan-calendar]');

test('without `fill` the plan sits in a framed block of its own height', async () => {
  const trip = { ...plannerFixture(), proposal: { sourceTripId: 'source' } } as never;
  await render(<TripCalendarPage trip={trip} />);
  await expect.element(page.getByTestId(testIds.tripCalendarPage)).toBeVisible();
  expect(frame()?.className).toContain('rounded-xl');
  expect(frame()?.className).not.toContain('flex-1');
});

test('a shared trip’s calendar fills the page and scrolls inside itself', async () => {
  await render(
    <div className="flex h-[40rem] flex-col">
      <TripCalendarPage fill trip={plannerFixture()} />
    </div>
  );
  const section = page.getByTestId(testIds.tripCalendarPage).element();
  expect(section.className).toContain('flex-1');
  expect(frame()?.className).toContain('rounded-none');
  expect(frame()?.className).not.toContain('rounded-xl');
  expect(frame()?.getBoundingClientRect().height).toBeGreaterThan(400);
});

test('with nothing planned the filled page shows the empty itinerary', async () => {
  const trip = plannerFixture();
  trip.destinations = [];
  trip.totalDurationDays = null;
  await render(<TripCalendarPage fill trip={trip} />);
  await expect.element(page.getByTestId(testIds.tripCalendarPage)).toBeVisible();
  expect(frame()).toBeNull();
});

test('shows the empty itinerary when nothing is planned yet', async () => {
  const trip = plannerFixture();
  trip.destinations = [];
  trip.totalDurationDays = null;
  await render(<TripCalendarPage trip={trip} />);
  await expect
    .element(page.getByRole('heading', { name: 'The itinerary is still wide open' }))
    .toBeVisible();
  await expect.element(page.getByText('Day 1', { exact: true })).not.toBeInTheDocument();
});

test('lays an undated trip out by trip day, without made-up dates', async () => {
  const trip = plannerFixture();
  trip.startDate = null;
  await render(<TripCalendarPage trip={trip} />);
  await expect.element(page.getByText('Day 1 – Day 3')).toBeVisible();
  await expect.element(page.getByText(/January|2001/u)).not.toBeInTheDocument();
});

test('opens on the day a link asks for, and follows later day jumps', async () => {
  const trip = plannerFixture();
  trip.totalDurationDays = 21;
  await render(<TripCalendarPage day={15} trip={trip} />);
  await expect.element(page.getByText('Day 15', { exact: true })).toBeVisible();
  jumpToDay(1);
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
});

/** Clicks Day 2 at 14:40 on the time grid. */
async function clickEmptyTime() {
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
  const canvas = document.querySelector<HTMLElement>('[data-cal-canvas]');
  if (!canvas) throw new Error('Expected the time grid');
  const hour = canvas.offsetHeight / 24;
  await page.elementLocator(canvas).click({
    position: { x: (canvas.offsetWidth / 3) * 1.5, y: hour * 14 + (hour * 40) / 60 }
  });
}

test('in an idea, a click on empty time adds an activity there', async () => {
  const addActivity = vi.fn(async () => true);
  await render(
    <TripCalendarPage
      planning={{ mode: 'add', addActivity, proposalId: 'idea-1' as never }}
      trip={plannerFixture()}
    />
  );
  await clickEmptyTime();
  const dialog = page.getByTestId(testIds.tripCalendarActivityDialog);
  await expect.element(dialog.getByRole('heading', { name: 'Add an activity' })).toBeVisible();
  await expect
    .element(page.getByTestId(testIds.tripCalendarActivityWhen))
    .toHaveTextContent('Day 2 · 14:30–15:30');
  await page.getByTestId(testIds.activityTitle).fill('Port tasting');
  await dialog.getByRole('button', { name: 'Add to the plan' }).click();
  await expect.poll(() => addActivity.mock.calls.length).toBe(1);
  // Day 2 is shared by both stops; the first is picked until the traveler chooses.
  expect(addActivity).toHaveBeenCalledWith(
    'lisbon',
    expect.objectContaining({
      schedule: expect.objectContaining({ day: 2, startTime: '14:30', endTime: '15:30' }),
      title: 'Port tasting'
    })
  );
  await expect.element(dialog).not.toBeInTheDocument();
});

test('on the shared trip, a click on empty time starts an idea holding the activity', async () => {
  const startIdea = vi.fn();
  await render(
    <TripCalendarPage planning={{ mode: 'propose', startIdea }} trip={plannerFixture()} />
  );
  await clickEmptyTime();
  const dialog = page.getByTestId(testIds.tripCalendarActivityDialog);
  await expect.element(dialog.getByRole('heading', { name: 'Suggest an activity' })).toBeVisible();
  await page.getByTestId(testIds.activityTitle).fill('Port tasting');
  await dialog.getByRole('button', { name: 'Start an idea with it' }).click();
  await expect.poll(() => startIdea.mock.calls.length).toBe(1);
  expect(startIdea).toHaveBeenCalledWith({
    input: expect.objectContaining({ title: 'Port tasting' }),
    sourceDestinationId: 'lisbon'
  });
  // Nothing waits for an idea until one is actually started.
  expect(usePendingCalendarActivityStore.getState().activity).toBeNull();
});

test('a slot running to midnight can be added, open-ended', async () => {
  const addActivity = vi.fn(async () => true);
  await render(
    <TripCalendarPage
      planning={{ mode: 'add', addActivity, proposalId: 'idea-1' as never }}
      trip={plannerFixture()}
    />
  );
  await expect.element(page.getByText('Day 1', { exact: true })).toBeVisible();
  const canvas = document.querySelector<HTMLElement>('[data-cal-canvas]');
  if (!canvas) throw new Error('Expected the time grid');
  // The last hour sits at the bottom of the grid's own scroller.
  const scroller = canvas.closest<HTMLElement>('[data-cal-scroll]');
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
  const hour = canvas.offsetHeight / 24;
  await page.elementLocator(canvas).click({
    position: { x: canvas.offsetWidth / 6, y: hour * 23 + hour / 2 + 2 }
  });
  await expect
    .element(page.getByTestId(testIds.tripCalendarActivityWhen))
    .toHaveTextContent('Day 1 · 23:30 · Lisbon');
  await page.getByTestId(testIds.activityTitle).fill('Night walk');
  await page.getByRole('button', { name: 'Add to the plan' }).click();
  await expect.poll(() => addActivity.mock.calls.length).toBe(1);
  expect(addActivity).toHaveBeenCalledWith(
    'lisbon',
    expect.objectContaining({ schedule: expect.objectContaining({ day: 1, startTime: '23:30' }) })
  );
});

test('without `planning` empty time plans nothing', async () => {
  await render(<TripCalendarPage trip={plannerFixture()} />);
  await clickEmptyTime();
  await expect
    .element(page.getByTestId(testIds.tripCalendarActivityDialog))
    .not.toBeInTheDocument();
});
