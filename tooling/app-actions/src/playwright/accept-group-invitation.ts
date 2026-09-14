import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';
import { signUp } from './sign-up';
import type { TestUserCredentials } from './unique-test-user';

export async function acceptGroupInvitation(
  page: Page,
  invitationUrl: string,
  member: TestUserCredentials
): Promise<void> {
  await signUp(page, member);
  await page.goto(invitationUrl);
  await expect(by(page, ids.invitationAccept)).toBeVisible();
  await by(page, ids.invitationAccept).click();
  await expect(by(page, ids.navTrips)).toBeVisible({ timeout: 30_000 });
}
