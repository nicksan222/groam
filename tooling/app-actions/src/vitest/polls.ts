import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by, dialogSubmit } from './locators';
import { enter, tap } from './queries';

const pollCard = (question: string) => page.getByRole('article', { name: `Poll: ${question}` });
const pollOption = (question: string, option: string) =>
  pollCard(question).getByRole('radio', { name: new RegExp(option, 'u') });

/** Creates a single-choice poll from the open trip's Polls tab. */
export async function createTripPoll({
  options,
  question
}: {
  options: string[];
  question: string;
}): Promise<void> {
  await tap(by(ids.tripPollsCreate));
  const dialog = by(ids.createPollDialog);
  await expect.element(dialog).toBeVisible();
  await enter(dialog.getByLabelText('Question'), question);
  for (const [index, option] of options.entries()) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each option input exists only after the previous "Add option" click; browser steps must run in order.
    if (index >= 2) await tap(by(ids.createPollAddOption));
    await enter(dialog.getByLabelText(`Option ${index + 1}`), option);
  }
  await tap(dialogSubmit(ids.createPollDialog));
  await expect.element(pollCard(question)).toBeVisible();
}

export async function voteInPoll(question: string, option: string): Promise<void> {
  await tap(pollOption(question, option));
  await expect.element(pollOption(question, option)).toBeChecked();
}

export async function expectPollProgress(question: string, text: string): Promise<void> {
  await expect.element(pollCard(question).getByText(text, { exact: false })).toBeVisible();
}

export async function closePoll(question: string): Promise<void> {
  await tap(by(ids.pollClose, pollCard(question)));
  await expect.element(pollCard(question).getByText('Closed')).toBeVisible();
}
