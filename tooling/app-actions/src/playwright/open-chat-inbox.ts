import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openChatInbox(target: UiTarget): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.navChat));
  await expect(by(user.page, ids.chatsTitle)).toBeVisible();
}
