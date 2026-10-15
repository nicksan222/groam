import {
  addIdea,
  arrange,
  by,
  expectPath,
  ideaRow,
  ids,
  openIdeaFromList,
  openSharedTrip,
  openTrip,
  openTripSection,
  openWorkspaceIdeas,
  presentAttribute,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('starts an idea and opens first-class idea routes', async () => {
  const suffix = uniqueSuffix();
  const tripName = `Idea routes ${suffix}`;
  const ideaName = `routes/open-idea-${suffix}`;

  await openApp();
  const tripId = await openTrip(await arrange.createTrip({ name: tripName }));
  await addIdea({ name: ideaName });
  await openSharedTrip();
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);
  await openTripSection('ideas');

  const draftRow = ideaRow({ title: ideaName });
  await expect.element(by(ids.ideaContinue, draftRow)).toBeVisible();
  await presentAttribute(draftRow, 'data-idea-id');

  await openWorkspaceIdeas();
  await expect.element(ideaRow({ title: ideaName })).toBeVisible();

  await openIdeaFromList({ title: ideaName }, 'continue');
  await expectPath(new RegExp(`/trips/${tripId}/ideas/[a-z]{6}/overview(?:\\?.*)?$`, 'u'));
});
