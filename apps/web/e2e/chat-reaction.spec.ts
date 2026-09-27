import {
  addGroupMemberViaInvite,
  chatMessage,
  chatRow,
  createGroupChat,
  openChatInbox,
  reactToChatMessage,
  reloadAppPage,
  sendChatMessage,
  signIn,
  uniqueSuffix,
  uniqueTestUser
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('a chat reaction remains visible after a page reload', async ({ browser, page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const member = uniqueTestUser('reaction-member');
  await addGroupMemberViaInvite(browser, page, member);
  await openChatInbox(page);
  const title = `Reactions ${suffix}`;
  await createGroupChat(page, { memberName: member.name, title });
  const message = `A great plan ${suffix}`;
  await sendChatMessage(page, message);
  // The composer shows optimistic messages before the server confirms them.
  await expect(chatRow(page, title)).toContainText(message);
  await reloadAppPage(page);
  await expect(chatMessage(page, message)).toBeVisible();
  await reactToChatMessage(page, message, 'Agree');
  await reloadAppPage(page);
  await expect(
    chatMessage(page, message).getByRole('button', { name: 'Agree', exact: true })
  ).toBeVisible();
});
