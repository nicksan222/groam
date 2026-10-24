import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by, dialogSubmit, queueRow } from './locators';
import { enter, tap } from './queries';
import { expectQueueItem } from './queue';

const pollCard = (question: string) => page.getByRole('article', { name: `Poll: ${question}` });
const pollOption = (question: string, option: string) =>
  pollCard(question).getByRole('radio', { name: new RegExp(option, 'u') });

/** Opens a poll's row in the Polls queue so its card shows; a card that is already open stays. */
async function openPollCard(question: string): Promise<void> {
  const card = pollCard(question);
  if (!card.query()) await tap(page.getByRole('button', { name: question, exact: true }));
  await expect.element(card).toBeVisible();
}

/** Creates a single-choice poll from the open trip's Polls section and opens its card. */
export async function createTripPoll({
  options,
  question
}: {
  options: string[];
  question: string;
}): Promise<void> {
  await tap(by(ids.newPoll));
  const dialog = by(ids.createPollDialog);
  await expect.element(dialog).toBeVisible();
  await enter(dialog.getByLabelText('Question'), question);
  for (const [index, option] of options.entries()) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each option input exists only after the previous "Add option" click; browser steps must run in order.
    if (index >= 2) await tap(by(ids.createPollAddOption));
    await enter(dialog.getByLabelText(`Option ${index + 1}`), option);
  }
  await tap(dialogSubmit(ids.createPollDialog));
  await openPollCard(question);
}

export async function voteInPoll(question: string, option: string): Promise<void> {
  await openPollCard(question);
  await tap(pollOption(question, option));
  await expect.element(pollOption(question, option)).toBeChecked();
}

export async function expectPollProgress(question: string, text: string): Promise<void> {
  await openPollCard(question);
  await expect.element(pollCard(question).getByText(text, { exact: false })).toBeVisible();
}

export async function closePoll(question: string): Promise<void> {
  await openPollCard(question);
  await tap(by(ids.pollClose, pollCard(question)));
  // A closed poll leaves the open groups, so follow it to Settled.
  await expectQueueItem(question, 'settled');
  await openPollCard(question);
  // The queue row names the closed status for screen readers (its glyph shows it); the card under
  // it only has its choices.
  await expect.element(queueRow(question)).toMatchTextContent(/^Closed\./u);
}
