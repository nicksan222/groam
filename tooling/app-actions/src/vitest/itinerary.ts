import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import {
  by,
  calendarDay,
  css,
  destinationCard,
  destinationResult,
  dialogSubmit,
  inlineActivityEditor
} from './locators';
import { openTripSection } from './open-trips';
import { expectHidden, isVisible, tap, enter } from './queries';

const dayHost = (day: number) => page.getByRole('region', { name: `Day ${day} schedule` });
const dayAttribute = (scope: Parameters<typeof css>[1], day: number) =>
  css(`[data-day="${day}"]`, scope);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** Selects the first seven selectable days on the trip calendar and saves them. */
export async function saveSevenDayRange(): Promise<void> {
  await expect.element(by(ids.tripDatesStart)).toBeEnabled();
  await tap(by(ids.tripDatesStart));
  await expect.poll(() => calendarDay().elements().length).toBeGreaterThan(10);
  const startDay = calendarDay().nth(10);
  const startValue = startDay.element().getAttribute('data-day');
  if (!startValue) throw new Error('Expected a selectable start day');
  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) throw new Error('Expected a parseable start day');
  const target = new Date(startDate);
  target.setDate(startDate.getDate() + 6);
  const endValue = target.toLocaleDateString();
  await tap(startDay);
  const endDay = calendarDay(endValue).first();
  await expect.element(endDay).toBeEnabled();
  await tap(endDay);
  await expect.element(by(ids.tripDatesSave)).toBeEnabled();
  await tap(by(ids.tripDatesSave));
  await expect.element(by(ids.tripDatesSave)).toMatchTextContent('Saved');
}

/**
 * Choose a destination's trip days on its card and save. A destination waiting to be scheduled
 * moves into its days once saved, so its card may leave the page instead of showing "Saved".
 */
export async function setDestinationSchedule(
  placeName: string,
  startDay: string,
  endDay: string
): Promise<void> {
  const card = destinationCard(placeName);
  const days = by(ids.dayRangeDays, card);
  const start = css(`[data-day="${startDay}"]`, days);
  const end = css(`[data-day="${endDay}"]`, days);
  if (!isVisible(start)) await tap(card.getByLabelText(/^Schedule & notes for /u));
  await expect.element(start).toBeVisible();
  if (endDay === startDay) await tap(start);
  else await start.dropTo(end);
  const save = by(ids.destinationSaveSchedule, card);
  if (save.elements().length > 0 && save.element().matches(':not(:disabled)')) await tap(save);
  await expect
    .poll(() => card.elements().length === 0 || save.query()?.textContent === 'Saved', {
      timeout: 20_000
    })
    .toBe(true);
  if (card.elements().length === 0) return;
  await expect.element(start).toHaveAttribute('aria-pressed', 'true');
  await expect.element(end).toHaveAttribute('aria-pressed', 'true');
}

export type AddStopInput = { endDay: string; name: string; notes: string; startDay: string };

/** Add a destination from the itinerary editor, then place it on its trip days. */
export async function addStop(input: AddStopInput): Promise<void> {
  await openTripSection('itinerary');
  await tap(
    page
      .getByRole('button', { name: 'Add destination' })
      .or(page.getByRole('button', { name: 'Add first destination' }))
      .first()
  );
  await expect.element(by(ids.addStopDialog)).toBeVisible();
  await enter(by(ids.destinationSearchInput), input.name);
  await tap(destinationResult(`${input.name}, Portugal`));
  await enter(by(ids.addStopPlans), input.notes);
  await tap(dialogSubmit(ids.addStopDialog));
  await expect.element(by(ids.addStopDialog)).not.toBeInTheDocument();
  const place = `${input.name}, Portugal`;
  await expect.element(destinationCard(place)).toBeVisible();
  await setDestinationSchedule(place, input.startDay, input.endDay);
  await expect
    .element(
      page.getByRole('button', {
        name: `Manage ${place} for Day ${input.startDay}`
      })
    )
    .toBeVisible();
}

export type AddFirstDestinationInput = { initialSearch?: string; name: string; notes: string };

export async function addFirstDestination(input: AddFirstDestinationInput): Promise<void> {
  await tap(page.getByRole('button', { name: 'Add first destination' }));
  const composer = by(ids.addStopDialog);
  await expect.element(composer).toBeVisible();
  await tap(composer.getByText('Destination'));
  const search = by(ids.destinationSearchInput);
  const submit = dialogSubmit(ids.addStopDialog);
  await expect.element(search).toHaveFocus();
  await expect.element(submit).toBeDisabled();
  if (input.initialSearch) {
    await enter(search, input.initialSearch);
    await tap(destinationResult(`${input.initialSearch}, Portugal`));
    await expect
      .element(composer.getByRole('status'))
      .toMatchTextContent(`${input.initialSearch}, Portugal`);
    await expect.element(submit).toBeEnabled();
  }
  await enter(search, input.name);
  await expect.element(submit).toBeDisabled();
  await tap(destinationResult(`${input.name}, Portugal`));
  await expect.element(submit).toBeEnabled();
  await enter(by(ids.addStopPlans), input.notes);
  await tap(submit);
  await expect.element(composer).not.toBeInTheDocument();
}

export async function openDestinationDetails(placeName: string): Promise<void> {
  await tap(
    page
      .getByRole('button', { name: `Open ${placeName} details for Day 1` })
      .or(page.getByRole('button', { name: `Manage ${placeName} for Day 1` }))
  );
  await expect.element(destinationCard(placeName)).toBeVisible();
}

/** Plans an activity on the first day that hosts `destination`, through the day's menu. */
export async function addActivity(input: {
  address?: string;
  destination: string;
  notes?: string;
  title: string;
}): Promise<void> {
  await openTripSection('itinerary');
  const day = page
    .getByRole('region', { name: /^Day \d+ schedule$/u })
    .filter({
      has: page.getByRole('button', {
        name: new RegExp(`^Manage ${escapeRegExp(input.destination)} for Day \\d+$`, 'u')
      })
    })
    .first();
  await tap(day.getByRole('button', { name: 'Add to day' }));
  await tap(page.getByRole('menuitem', { name: 'Activity' }));
  const panel = inlineActivityEditor();
  await enter(by(ids.activityTitle, panel), input.title);
  if (input.address) await enter(by(ids.activityAddress, panel), input.address);
  if (input.notes) {
    const notes = by(ids.activityNotes, panel);
    if (!isVisible(notes)) await tap(by(ids.activityMoreOptions, panel));
    await enter(notes, input.notes);
  }
  await tap(by(ids.activitySubmit, panel));
  await expectHidden(panel);
  await expect.element(page.getByRole('button', { name: `Edit ${input.title}` })).toBeVisible();
}

export async function editActivity(input: { address?: string; title: string }): Promise<void> {
  await tap(page.getByRole('button', { name: `Edit ${input.title}` }));
  const editor = inlineActivityEditor();
  await expect.element(by(ids.activityTitle, editor)).toHaveValue(input.title);
  if (input.address !== undefined) await enter(by(ids.activityAddress, editor), input.address);
  await tap(by(ids.activitySubmit, editor));
  await expectHidden(editor);
}

export async function setActivityDayRange(startDay: number, endDay: number): Promise<void> {
  const editor = inlineActivityEditor();
  const days = by(ids.dayRangeDays, editor);
  const start = dayAttribute(days, startDay);
  const end = dayAttribute(days, endDay);
  // New inline activities keep their dates under "More options".
  if (!isVisible(start)) await tap(by(ids.activityMoreOptions, editor));
  // Clicking the selected start day anchors a new range without clearing it.
  await tap(start);
  if (startDay !== endDay) await tap(end);
  await expect.element(start).toHaveAttribute('aria-pressed', 'true');
  await expect.element(end).toHaveAttribute('aria-pressed', 'true');
}

/** Open the inline activity editor from a day's "Add to day" menu (first plannable day by default). */
export async function startActivityPlan(day?: number): Promise<void> {
  const scopes = day
    ? [page.getByRole('region', { name: `Day ${day} schedule` })]
    : page.getByRole('region', { name: /^Day \d+ schedule$/u }).all();
  for (const scope of scopes) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Days are tried in order; the first open one wins.
    await tap(scope.getByRole('button', { name: 'Add to day' }));
    const activity = page.getByRole('menuitem', { name: 'Activity' });
    await expect.element(activity).toBeVisible();
    if (activity.element().getAttribute('aria-disabled') !== 'true') {
      await tap(activity);
      return;
    }
    await userEvent.keyboard('{Escape}');
  }
  throw new Error('No itinerary day accepts an activity yet');
}

export async function continueActivityPlan(
  title: string,
  range?: { endDay: number; startDay: number }
): Promise<void> {
  if (range) await setActivityDayRange(range.startDay, range.endDay);
  const editor = inlineActivityEditor();
  await enter(by(ids.activityTitle, editor), title);
  await tap(by(ids.activitySubmit, editor));
}

export async function openActivityPlan(title: string, day?: number): Promise<void> {
  const scope = day ? dayHost(day) : page;
  await tap(scope.getByRole('button', { name: `Edit ${title}` }));
}

export async function removeActivityPlan(title: string): Promise<void> {
  await tap(page.getByRole('button', { name: `Remove ${title}` }));
  await tap(page.getByRole('button', { name: 'Remove plan' }));
}

export async function discardActivityChanges(title: string, unsavedAddress: string): Promise<void> {
  await openActivityPlan(title);
  const editor = inlineActivityEditor();
  await enter(by(ids.activityAddress, editor), unsavedAddress);
  await tap(editor.getByRole('button', { name: 'Cancel' }));
  await expectHidden(editor);
}

export async function keepActivityPlan(title: string): Promise<void> {
  await openActivityPlan(title);
  const editor = inlineActivityEditor();
  await tap(editor.getByRole('button', { name: `Remove ${title}` }));
  await expect.element(editor.getByRole('button', { name: 'Remove plan' })).toBeVisible();
  await tap(editor.getByRole('button', { name: 'Keep plan' }));
  await tap(editor.getByRole('button', { name: 'Cancel' }));
  await expectHidden(editor);
}

export type InlineActivityPeriod = 'afternoon' | 'evening' | 'morning';

const periodLabels = {
  afternoon: 'Afternoon',
  evening: 'Evening',
  morning: 'Morning'
} as const satisfies Record<InlineActivityPeriod, string>;

export async function addInlineActivity(input: {
  day: number;
  destination?: string;
  expectDayReset?: boolean;
  notes?: string;
  period: InlineActivityPeriod;
  range?: { endDay: number; startDay: number };
  title: string;
}): Promise<void> {
  const day = dayHost(input.day);
  await tap(day.getByRole('button', { name: 'Add to day' }));
  await tap(page.getByRole('menuitem', { name: 'Activity' }));
  const form = by(ids.activityInlineEditor, day);
  await expect.element(form).toHaveAttribute('aria-label', `Add an activity to Day ${input.day}`);
  await enter(by(ids.activityTitle, form), input.title);
  const period = form.getByRole('button', { name: periodLabels[input.period] });
  await tap(period);
  await expect.element(period).toHaveAttribute('aria-pressed', 'true');
  if (input.range) {
    await tap(by(ids.activityMoreOptions, form));
    await setActivityDayRange(input.range.startDay, input.range.endDay);
  }
  if (input.destination) {
    await tap(form.getByRole('combobox', { name: 'Destination' }));
    await tap(page.getByRole('option', { name: input.destination }));
    await expect.element(by(ids.activityTitle, form)).toHaveValue(input.title);
    if (input.expectDayReset) {
      const days = by(ids.dayRangeDays, form);
      await expect.element(dayAttribute(days, input.day)).toHaveAttribute('aria-pressed', 'true');
      if (input.range && input.range.startDay !== input.day) {
        await expect
          .element(dayAttribute(days, input.range.startDay))
          .toHaveAttribute('aria-pressed', 'false');
      }
    }
  }
  if (input.notes) {
    const notes = by(ids.activityNotes, form);
    if (!isVisible(notes)) await tap(by(ids.activityMoreOptions, form));
    await enter(notes, input.notes);
  }
  await tap(by(ids.activitySubmit, form));
  await expect.poll(() => form.elements().length).toBe(0);
  await expect.element(day.getByRole('button', { name: `Edit ${input.title}` })).toBeVisible();
}

export async function editInlineActivity(input: {
  address: string;
  day: number;
  period?: InlineActivityPeriod;
  title: string;
}): Promise<void> {
  const day = dayHost(input.day);
  await tap(day.getByRole('button', { name: `Edit ${input.title}` }));
  const form = by(ids.activityInlineEditor, day);
  await expect.element(form).toHaveAttribute('aria-label', `Edit ${input.title}`);
  if (input.period) {
    await expect
      .element(form.getByRole('button', { name: periodLabels[input.period] }))
      .toHaveAttribute('aria-pressed', 'true');
  }
  await enter(by(ids.activityAddress, form), input.address);
  await tap(by(ids.activitySubmit, form));
  await expect.poll(() => form.elements().length).toBe(0);
}
