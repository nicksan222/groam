import {
  addIdea,
  arrange,
  by,
  expectPath,
  expectQueueItem,
  ids,
  openIdeaFromQueue,
  openTripQueue,
  openSharedTrip,
  openTrip,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('starts an idea and opens first-class idea routes', async () => {
  const suffix = uniqueSuffix();
  const tripName = `Idea routes ${suffix}`;
  const ideaName = `routes/open-idea-${suffix}`;

  await openApp();
  const tripId = await openTrip(await arrange.createTrip({ name: tripName }));
  await addIdea({ name: ideaName });
  await openSharedTrip();
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);

  // The trip's Ideas queue lists the draft, and the viewer's own draft opens on its overview.
  await openTripQueue(tripId, 'ideas');
  await expectQueueItem(ideaName, 'open');
  await openIdeaFromQueue(tripId, ideaName);
  await expectPath(new RegExp(`/trips/${tripId}/ideas/[a-z]{6}/overview(?:\\?.*)?$`, 'u'));
});
