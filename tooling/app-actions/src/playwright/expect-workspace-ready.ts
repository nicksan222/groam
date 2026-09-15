import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';

export async function expectWorkspaceReady(page: Page): Promise<void> {
  if (await by(page, ids.workspaceErrorRetry).isVisible()) {
    await by(page, ids.workspaceErrorRetry).click();
  }
  await expect(by(page, ids.navTrips)).toBeVisible({ timeout: 30_000 });
}
