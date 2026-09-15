import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { sharedTripPath } from './shared-trip-path';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function watchSharedTrip(target: UiTarget): Promise<void> {
  const user = ui(target);
  const path = sharedTripPath(user);
  if (!path) throw new Error('Expected the participant to be viewing a trip');
  await user.page.goto(path);
  await expect(user.page.getByTestId(ids.tripHeading)).toBeVisible();
}
