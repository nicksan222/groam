import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { by, destinationCard, destinationResult, dialogSubmit } from './locators';
import { openTripSection } from './open-trip-section';
import { setDestinationSchedule } from './set-destination-schedule';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type AddStopInput = {
  endDay: string;
  name: string;
  notes: string;
  startDay: string;
};

/** Add a destination from the itinerary editor, then place it on its trip days. */
export async function addStop(page: Page, input: AddStopInput): Promise<void> {
  await openTripSection(page, 'itinerary');
  await page
    .getByRole('button', { name: 'Add destination', exact: true })
    .or(page.getByRole('button', { name: 'Add first destination', exact: true }))
    .first()
    .click();
  await expect(by(page, ids.addStopDialog)).toBeVisible();
  await by(page, ids.destinationSearchInput).fill(input.name);
  await destinationResult(page, `${input.name}, Portugal`).click();
  await by(page, ids.addStopPlans).fill(input.notes);
  await dialogSubmit(page, ids.addStopDialog).click();
  await expect(by(page, ids.addStopDialog)).toBeHidden();
  const place = `${input.name}, Portugal`;
  const card = destinationCard(page, place);
  await expect(card).toBeVisible();
  await setDestinationSchedule(card, input.startDay, input.endDay);
  await expect(
    page.getByRole('button', { name: `Manage ${place} for Day ${input.startDay}`, exact: true })
  ).toBeVisible();
}
