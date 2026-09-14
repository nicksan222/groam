import { expect, type Page } from '@playwright/test';
import { appPath } from './app-href';
import { ids } from './ids';
import { by } from './locators';
import type { TestUserCredentials } from './unique-test-user';

export async function signUp(page: Page, user: TestUserCredentials): Promise<void> {
  await page.goto(appPath);
  if (!(await by(page, ids.authName).isVisible())) await by(page, ids.authSwitchFlow).click();
  await expect(by(page, ids.authName)).toBeVisible();
  await by(page, ids.authName).fill(user.name);
  await by(page, ids.authEmail).fill(user.email);
  await by(page, ids.authPassword).fill(user.password);
  await by(page, ids.authSubmit).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(by(page, ids.onboardingWelcome)).toBeVisible({ timeout: 30_000 });
}
