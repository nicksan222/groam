import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';

export async function signOut(page: Page): Promise<void> {
  await by(page, ids.navUserTrigger).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(by(page, ids.authSubmit)).toBeVisible();
}
