import {
  arrange,
  assistantPanel,
  openGroamAssistant,
  openTrip,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('opens Groam AI on a trip with a ready prompt', async () => {
  // Each journey file owns a fresh account, which keeps the per-user AI thread rate limit out of the way.
  const tripId = await arrange.createTrip({ name: `Assistant ${uniqueSuffix()}` });
  await openApp();
  await openTrip(tripId);
  await openGroamAssistant();
  await expect.element(assistantPanel()).toBeVisible();
});
