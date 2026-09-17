import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';

export async function signOut(page: Page): Promise<void> {
  const menuItem = page.getByRole('menuitem', { name: 'Sign out' });
  await expect(async () => {
    if (!(await menuItem.isVisible())) await by(page, ids.navUserTrigger).click();
    await expect(menuItem).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 10_000 });
  await menuItem.click();
  await expect(by(page, ids.authSubmit)).toBeVisible();
}
