import {
  arrange,
  by,
  expectPath,
  ids,
  openSharedTrip,
  startWorkspaceIdea,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/testing/open-app';

test('starts a new idea from workspace Ideas for the selected trip', async () => {
  const suffix = uniqueSuffix();
  const firstName = `Unselected trip ${suffix}`;
  const selectedName = `Selected trip ${suffix}`;
  await arrange.createTrip({ name: firstName });
  await arrange.createTrip({ name: selectedName });
  await openApp();
  const ideaName = `Change the selected trip ${suffix}`;

  await startWorkspaceIdea({ tripName: selectedName, title: ideaName });
  // The shared trip check below proves the idea belongs to the selected trip.
  await expectPath(/\/trips\/[^/]+\/ideas\/[^/]+\/overview/u);
  await expect.element(page.getByRole('heading', { name: ideaName })).toBeVisible();
  await openSharedTrip();
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', selectedName);
});
