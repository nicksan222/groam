import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openTrips(target: UiTarget): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.navTrips));
  await expect(by(user.page, ids.tripsTitle)).toBeVisible();
}
