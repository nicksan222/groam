import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function expectTripsReady(page: Page): Promise<void> {
  await expect(by(page, ids.tripsTitle)).toBeVisible({ timeout: 30_000 });
}
