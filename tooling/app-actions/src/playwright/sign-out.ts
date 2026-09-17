import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';

export async function signOut(page: Page): Promise<void> {
  await expect(async () => {
    if (await by(page, ids.authSubmit).isVisible()) return;
    const menuItem = page.getByRole('menuitem', { name: 'Sign out' });
    if (!(await menuItem.isVisible())) await by(page, ids.navUserTrigger).click();
    await menuItem.click({ timeout: 2000 });
    await expect(by(page, ids.authSubmit)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 10_000 });
}
