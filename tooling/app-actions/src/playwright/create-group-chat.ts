import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, chatMember, dialogSubmit } from './locators';
import { openChatInbox } from './open-chat-inbox';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type CreateGroupChatInput = {
  memberName: string;
  observerPage?: Page;
  title: string;
  tripName?: string;
};

export async function createGroupChat(
  target: UiTarget,
  input: CreateGroupChatInput
): Promise<void> {
  const user = ui(target);
  await openChatInbox(user);
  await user.click(by(user.page, ids.newChat).first());
  const dialog = by(user.page, ids.newChatDialog);
  await expect(dialog).toBeVisible();
  await user.type(by(user.page, ids.newChatTitle), input.title);
  if (input.tripName) {
    await user.click(dialog.getByRole('combobox'));
    await user.click(user.page.getByRole('option', { name: input.tripName, exact: true }));
  }
  const memberButton = chatMember(user.page, input.memberName);
  await expect(memberButton).toBeVisible({ timeout: 30_000 });
  await user.click(memberButton);
  await user.click(dialogSubmit(user.page, ids.newChatDialog));
  await expect(dialog).toBeHidden();
  await expect(by(user.page, ids.chatHeading)).toContainText(input.title);
  if (input.observerPage) {
    await by(input.observerPage, ids.navChat).click();
    await by(input.observerPage, ids.chatRow).filter({ hasText: input.title }).click();
    await expect(by(input.observerPage, ids.chatHeading)).toContainText(input.title);
  }
}
