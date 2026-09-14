import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { by, destinationCard, destinationResult, dialogSubmit } from './locators';
import { setDestinationSchedule } from './set-destination-schedule';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type AddStopInput = {
  endDay: string;
  name: string;
  notes: string;
  startDay: string;
};

export async function addStop(page: Page, input: AddStopInput): Promise<void> {
  await page.getByRole('button', { name: 'Add a plan', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Destination', exact: true }).click();
  await expect(by(page, ids.addStopDialog)).toBeVisible();
  await by(page, ids.destinationSearchInput).fill(input.name);
  await destinationResult(page, `${input.name}, Portugal`).click();
  await by(page, ids.addStopPlans).fill(input.notes);
  await dialogSubmit(page, ids.addStopDialog).click();
  await expect(by(page, ids.addStopDialog)).toBeHidden();
  await page
    .locator('[data-slot="shell-right-column"]')
    .getByRole('button')
    .filter({ hasText: `${input.name}, Portugal` })
    .click();
  const card = destinationCard(page, `${input.name}, Portugal`);
  await expect(card).toBeVisible();
  await setDestinationSchedule(card, input.startDay, input.endDay);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
}
