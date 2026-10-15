import {
  chatRow,
  createGroupChat,
  openApp,
  openChatInbox,
  sendMessage,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('chats with a group member', async ({ arrange, page }) => {
  test.setTimeout(180_000);
  const suffix = uniqueSuffix();
  const member = await arrange.addMember('chat-member');
  await openApp(page);

  await openChatInbox(page);
  await createGroupChat(page, { memberName: member.name, title: `Dates thread ${suffix}` });
  await sendMessage(page, { text: `Should we aim for late July? (${suffix})` });
  await openChatInbox(page);
  await expect(chatRow(page, `Dates thread ${suffix}`)).toBeVisible();
});
