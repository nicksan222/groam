import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by, dialogSubmit } from './locators';

export async function inviteGroupMember(page: Page): Promise<string> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await by(page, ids.navSettings).click();
  await by(page, ids.settingsSectionGroup).click();
  await by(page, ids.inviteMember).click();
  await expect(by(page, ids.inviteDialog)).toBeVisible();
  await dialogSubmit(page, ids.inviteDialog).click();
  await expect(by(page, ids.invitationCode)).toBeVisible();
  const displayedCode = await by(page, ids.invitationCode).inputValue();
  expect(displayedCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/u);
  await page.getByRole('button', { name: 'Copy invitation code' }).click();
  await expect(page.getByRole('button', { name: 'Invitation code copied' })).toBeVisible();
  const copiedCode = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedCode).toBe(displayedCode);
  await by(page, ids.invitationDone).click();
  return copiedCode;
}
