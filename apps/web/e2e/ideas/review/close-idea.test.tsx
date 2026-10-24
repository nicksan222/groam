import {
  arrange,
  closeIdea,
  expectQueueItem,
  queueRowIn,
  openIdea,
  openTripQueue,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('deletes a draft idea without leaving an editable working copy', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Abandoned trip ${suffix}` });
  const name = `Abandoned idea ${suffix}`;
  const { proposalId } = await arrange.startIdea({ name, tripId });
  await openApp();
  await openIdea({ proposalId, tripId });
  await closeIdea();
  await openTripQueue(tripId, 'ideas');
  await expectQueueItem(name, 'settled');
  await expect.element(queueRowIn(name, 'open')).not.toBeInTheDocument();
});

test('requires a reason to pass on an idea already in review', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Review trip ${suffix}` });
  const name = `Pass on idea ${suffix}`;
  const idea = await arrange.startIdea({ name, tripId });
  await arrange.updateTrip({ dateNotes: 'Try a different week', tripId: idea.workingTripId });
  await arrange.requestIdeaReview(idea.proposalId);
  await openApp();
  await openIdea({ proposalId: idea.proposalId, tripId });
  await closeIdea('The original week works better');
  await openTripQueue(tripId, 'ideas');
  await expectQueueItem(name, 'settled');
  await expect.element(queueRowIn(name, 'open')).not.toBeInTheDocument();
});
