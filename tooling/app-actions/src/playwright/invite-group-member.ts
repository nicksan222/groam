import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by, dialogSubmit } from './locators';

export async function inviteGroupMember(page: Page, memberEmail: string): Promise<string> {
  await by(page, ids.navSettings).click();
  await by(page, ids.settingsSectionGroup).click();
  await by(page, ids.inviteMember).click();
  await expect(by(page, ids.inviteDialog)).toBeVisible();
  await by(page, ids.inviteEmail).fill(memberEmail);
  await dialogSubmit(page, ids.inviteDialog).click();
  await expect(by(page, ids.invitationLink)).toBeVisible();
  const invitationUrl = await by(page, ids.invitationLink).inputValue();
  await by(page, ids.invitationDone).click();
  return invitationUrl;
}
