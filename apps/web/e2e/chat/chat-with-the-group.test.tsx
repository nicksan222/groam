import {
  arrange,
  chatRow,
  createGroupChat,
  openChatInbox,
  sendChatMessage,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('chats with a group member', async () => {
  const suffix = uniqueSuffix();
  const member = await arrange.addMember('chat-member');
  await openApp();

  await createGroupChat({ memberName: member.name, title: `Dates thread ${suffix}` });
  await sendChatMessage(`Should we aim for late July? (${suffix})`);
  await openChatInbox();
  await expect.element(chatRow(`Dates thread ${suffix}`)).toBeVisible();
});
