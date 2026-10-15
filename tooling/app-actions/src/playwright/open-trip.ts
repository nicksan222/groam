import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { by, idFromPath } from './locators';
import { openAppPath } from './open-app-path';

const expect = playwrightExpect.configure({ timeout: 30_000 });

/**
 * Opens a shared trip directly, typically one arranged through the backend, and returns the
 * short id the app canonicalizes its URL to.
 */
export async function openTrip(page: Page, tripId: string): Promise<string> {
  await openAppPath(page, `trips/${tripId}`);
  await expect(by(page, ids.tripHeading)).toBeVisible();
  await expect(page).toHaveURL(/\/trips\/[a-z]{6}(?:[/?#]|$)/u);
  return idFromPath(page, 'trips');
}
