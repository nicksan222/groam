import { expect as playwrightExpect } from '@playwright/test';
import type { CreateTripInput } from '#src/actions/create-trip';
import { createTripButton } from '#src/playwright/create-trip-button';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by, dialogSubmit, idFromPath } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function createTrip(target: UiTarget, input: CreateTripInput): Promise<string> {
  const user = ui(target);
  const { page } = user;
  const tripName = input.name;
  await user.click(by(page, ids.navTrips));
  await expect(by(page, ids.tripsTitle)).toBeVisible();
  const emptyState = by(page, ids.createTripEmpty);
  await user.click((await emptyState.isVisible()) ? emptyState : createTripButton(page));
  await expect(by(page, ids.createTripDialog)).toBeVisible();
  await user.type(by(page, ids.createTripName), tripName);
  if (input.dateNotes || input.durationDays) {
    await user.click(page.getByText('Add dates and budget'));
  }
  if (input.dateNotes) await user.type(by(page, ids.createTripDateNotes), input.dateNotes);
  if (input.durationDays) {
    await user.type(by(page, ids.createTripDuration), String(input.durationDays));
  }
  await user.click(dialogSubmit(page, ids.createTripDialog));
  await expect(by(page, ids.createTripDialog)).toBeHidden({ timeout: 20_000 });
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', tripName, {
    timeout: 30_000
  });
  return idFromPath(page, 'trips');
}
