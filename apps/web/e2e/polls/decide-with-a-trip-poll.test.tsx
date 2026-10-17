import {
  arrange,
  closePoll,
  createTripPoll,
  expectPollProgress,
  openTrip,
  openTripSection,
  uniqueSuffix,
  voteInPoll
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

test('the group decides with a trip poll', async () => {
  const suffix = uniqueSuffix();
  const question = `Dinner Friday ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Poll trip ${suffix}` });
  await openApp();
  await openTrip(tripId);
  await openTripSection('polls');
  await createTripPoll({ options: ['Sushi', 'Tapas', 'Pizza'], question });
  await expectPollProgress(question, '0 of');
  await voteInPoll(question, 'Tapas');
  await expectPollProgress(question, '1 of');
  await closePoll(question);
  await expect
    .element(
      page
        .getByRole('article', { name: `Poll: ${question}` })
        .getByRole('radio', { name: /Tapas/u })
    )
    .toBeDisabled();
});
