import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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
import { expectGone, tap, enter } from './queries';

const dayHost = (day: number) => page.getByRole('region', { name: `Day ${day} schedule` });

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Selects the first seven selectable days on the trip calendar and saves them. The calendar labels
 * its days with the browser locale, which the Vitest browser config pins to en-US.
 */
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
 * moves into its days once saved (`moved`: its card leaves the page); a scheduled one stays and
 * its button reads "Saved" (`saved`).
 */
async function setDestinationSchedule(
  placeName: string,
  startDay: string,
  endDay: string,
  outcome: 'moved' | 'saved'
): Promise<void> {
  const card = destinationCard(placeName);
  const days = by(ids.dayRangeDays, card);
  const start = css(`[data-day="${startDay}"]`, days);
  const end = css(`[data-day="${endDay}"]`, days);
  await tap(card.getByLabelText(/^Schedule & notes for /u));
  if (endDay === startDay) await tap(start);
  else await start.dropTo(end);
  await tap(by(ids.destinationSaveSchedule, card));
  if (outcome === 'moved') {
    await expectGone(card);
    return;
  }
  await expect.element(by(ids.destinationSaveSchedule, card)).toMatchTextContent('Saved');
  await expect.element(start).toHaveAttribute('aria-pressed', 'true');
  await expect.element(end).toHaveAttribute('aria-pressed', 'true');
}

export type AddStopInput = {
  endDay: string;
  /** The itinerary has no destination yet, so the first one is added from its empty state. */
  first?: boolean;
  name: string;
  notes: string;
  startDay: string;
};

/** Add a destination from the itinerary editor, then place it on its trip days. */
export async function addStop(input: AddStopInput): Promise<void> {
  await openTripSection('itinerary');
  await tap(
    page
      .getByRole('button', { name: input.first ? 'Add first destination' : 'Add destination' })
      .first()
  );
  await expect.element(by(ids.addStopDialog)).toBeVisible();
  await enter(by(ids.destinationSearchInput), input.name);
  await tap(destinationResult(`${input.name}, Portugal`));
  await enter(by(ids.addStopPlans), input.notes);
  await tap(dialogSubmit(ids.addStopDialog));
  await expectGone(by(ids.addStopDialog));
  const place = `${input.name}, Portugal`;
  await expect.element(destinationCard(place)).toBeVisible();
  await setDestinationSchedule(place, input.startDay, input.endDay, 'moved');
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
  await expectGone(composer);
}

export async function openDestinationDetails(placeName: string): Promise<void> {
  await tap(page.getByRole('button', { name: `Manage ${placeName} for Day 1` }));
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
    // Notes sit under "More options", which an inline editor keeps closed.
    await tap(by(ids.activityMoreOptions, panel));
    await enter(by(ids.activityNotes, panel), input.notes);
  }
  await tap(by(ids.activitySubmit, panel));
  await expectGone(panel);
  await expect.element(page.getByRole('button', { name: `Edit ${input.title}` })).toBeVisible();
}

export async function editActivity(input: { address?: string; title: string }): Promise<void> {
  await tap(page.getByRole('button', { name: `Edit ${input.title}` }));
  const editor = inlineActivityEditor();
  await expect.element(by(ids.activityTitle, editor)).toHaveValue(input.title);
  if (input.address !== undefined) await enter(by(ids.activityAddress, editor), input.address);
  await tap(by(ids.activitySubmit, editor));
  await expectGone(editor);
}

/** Opens the inline activity editor from a day's "Add to day" menu. */
export async function startActivityPlan(day: number): Promise<void> {
  await tap(dayHost(day).getByRole('button', { name: 'Add to day' }));
  await tap(page.getByRole('menuitem', { name: 'Activity' }));
}

export async function continueActivityPlan(title: string): Promise<void> {
  const editor = inlineActivityEditor();
  await enter(by(ids.activityTitle, editor), title);
  await tap(by(ids.activitySubmit, editor));
}
