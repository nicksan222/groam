import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function expectHomeDashboard(page: Page): Promise<void> {
  await expect(by(page, ids.homeDashboard)).toBeVisible();
}
