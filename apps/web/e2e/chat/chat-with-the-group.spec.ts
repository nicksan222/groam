import {
  addGroupMemberViaInvite,
  chatRow,
  createGroupChat,
  openChatInbox,
  sendMessage,
  signIn,
  uniqueSuffix,
  uniqueTestUser
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('chats with a group member', async ({ browser, page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const member = uniqueTestUser('chat-member');
  await addGroupMemberViaInvite(browser, page, member);

  await openChatInbox(page);
  await createGroupChat(page, { memberName: member.name, title: `Dates thread ${suffix}` });
  await sendMessage(page, { text: `Should we aim for late July? (${suffix})` });
  await openChatInbox(page);
  await expect(chatRow(page, `Dates thread ${suffix}`)).toBeVisible();
});
