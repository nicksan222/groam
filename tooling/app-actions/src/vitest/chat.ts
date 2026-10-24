import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, chatMember, chatMessage, dialogSubmit } from './locators';
import { expectGone, tap, enter } from './queries';

export async function openChatInbox(): Promise<void> {
  await openAppPath('chat');
  await expect.element(by(ids.chatsTitle)).toBeVisible();
}

/** Fills the new-chat dialog that is open and starts the chat; waits for its thread. */
async function startChat(input: { memberName: string; title: string }): Promise<void> {
  const dialog = by(ids.newChatDialog);
  await expect.element(dialog).toBeVisible();
  await enter(by(ids.newChatTitle), input.title);
  const memberButton = chatMember(input.memberName);
  await expect.element(memberButton).toBeVisible();
  await tap(memberButton);
  await tap(dialogSubmit(ids.newChatDialog));
  await expectGone(dialog);
  await expect.element(by(ids.chatHeading)).toMatchTextContent(input.title);
}

/** Starts a chat from the Chats page: it belongs to no trip. */
export async function createGroupChat(input: { memberName: string; title: string }): Promise<void> {
  await openChatInbox();
  await tap(by(ids.newChat).first());
  await startChat(input);
}

/** Types into the chat composer and sends with Enter; waits until the message is listed. */
export async function sendChatMessage(message: string): Promise<void> {
  const composer = by(ids.chatComposerInput);
  await enter(composer, message);
  await tap(composer);
  await userEvent.keyboard('{Enter}');
  await expect.element(chatMessage(message)).toBeVisible();
}

export async function reactToChatMessage(message: string, reaction: string): Promise<void> {
  const row = chatMessage(message);
  await row.hover();
  await tap(by(ids.chatMessageReact, row));
  await tap(page.getByRole('button', { name: reaction }));
  await expect.element(row.getByRole('button', { name: reaction })).toBeVisible();
}
