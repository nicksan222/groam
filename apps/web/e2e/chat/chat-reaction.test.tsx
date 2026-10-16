import {
  arrange,
  chatMessage,
  chatRow,
  createGroupChat,
  reactToChatMessage,
  reloadAppPage,
  sendChatMessage,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('a chat reaction remains visible after a page reload', async () => {
  const suffix = uniqueSuffix();
  const member = await arrange.addMember('reaction-member');
  await openApp();
  const title = `Reactions ${suffix}`;
  await createGroupChat({ memberName: member.name, title });
  const message = `A great plan ${suffix}`;
  await sendChatMessage(message);
  // The composer shows optimistic messages before the server confirms them.
  await expect.element(chatRow(title)).toMatchTextContent(message);
  await reloadAppPage();
  await expect.element(chatMessage(message)).toBeVisible();
  await reactToChatMessage(message, 'Agree');
  await reloadAppPage();
  await expect.element(chatMessage(message).getByRole('button', { name: 'Agree' })).toBeVisible();
});
