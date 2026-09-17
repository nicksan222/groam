import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';
import { signUp } from './sign-up';
import type { TestUserCredentials } from './unique-test-user';

export async function acceptGroupInvitation(
  page: Page,
  invitationCode: string,
  member: TestUserCredentials
): Promise<void> {
  await signUp(page, member);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate((code) => navigator.clipboard.writeText(code), invitationCode);
  const codeInput = by(page, ids.joinGroupCode);
  await expect(codeInput).toBeVisible();
  await codeInput.click();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(codeInput).toHaveValue(invitationCode);
  await page.getByRole('button', { name: 'Join group' }).click();
  await expect(by(page, ids.navTrips)).toBeVisible({ timeout: 30_000 });
}
