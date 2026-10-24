import {
  arrange,
  by,
  currentPath,
  ids,
  openTrip,
  openTripSection,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('moves between the plan and the activity history from the sidebar', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Plan history trip ${suffix}` });
  await openApp();
  await openTrip(tripId);
  await expect.element(by(ids.tripPlanPage)).toBeVisible();

  await openTripSection('activity');
  expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/activity$/u);
  await openTripSection('plan');
  expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/plan$/u);
});
