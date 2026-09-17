import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by, dialogSubmit } from './locators';

export async function redeemGroupInvitationCode(page: Page, invitationCode: string): Promise<void> {
  await by(page, ids.groupSwitcher).click();
  await by(page, ids.groupSwitcherJoin).click();
  await expect(by(page, ids.joinGroupDialog)).toBeVisible();
  await by(page, ids.joinGroupCode).fill(invitationCode);
  await dialogSubmit(page, ids.joinGroupDialog).click();
  await expect(by(page, ids.joinGroupDialog)).toBeHidden();
}
