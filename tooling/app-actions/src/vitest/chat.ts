import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by, chatMember, chatMessage, dialogSubmit } from './locators';
import { tap, enter } from './queries';

export async function openChatInbox(): Promise<void> {
  await tap(by(ids.navChat));
  await expect.element(by(ids.chatsTitle)).toBeVisible();
}

export async function createGroupChat(input: {
  memberName: string;
  title: string;
  tripName?: string;
}): Promise<void> {
  await openChatInbox();
  await tap(by(ids.newChat).first());
  const dialog = by(ids.newChatDialog);
  await expect.element(dialog).toBeVisible();
  await enter(by(ids.newChatTitle), input.title);
  if (input.tripName) {
    await tap(dialog.getByRole('combobox'));
    await tap(page.getByRole('option', { name: input.tripName }));
  }
  const memberButton = chatMember(input.memberName);
  await expect.element(memberButton).toBeVisible();
  await tap(memberButton);
  await tap(dialogSubmit(ids.newChatDialog));
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(by(ids.chatHeading)).toMatchTextContent(input.title);
}

/** Types into the chat composer and sends with Enter; waits until the message is listed. */
export async function sendChatMessage(message: string): Promise<void> {
  const composer = page.getByTestId(`${ids.chatComposer}-input`);
  await enter(composer, message);
  await tap(composer);
  await userEvent.keyboard('{Enter}');
  await expect.element(chatMessage(message)).toBeVisible();
}

export const sendMessage = (input: { text: string }) => sendChatMessage(input.text);

export async function reactToChatMessage(message: string, reaction: string): Promise<void> {
  const row = chatMessage(message);
  await row.hover();
  await tap(by(ids.chatMessageReact, row));
  await tap(page.getByRole('button', { name: reaction }));
  await expect.element(row.getByRole('button', { name: reaction })).toBeVisible();
}
