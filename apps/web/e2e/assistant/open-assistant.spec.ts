import { openGroamAssistant, openTrip, uniqueSuffix } from '@groam/app-actions/playwright';
import { test } from '@groam/app-actions/playwright/test';

test('opens Groam AI on a trip with a ready prompt', async ({ arrange, page }) => {
  // Each worker owns a fresh account, which keeps the per-user AI thread rate limit out of the way.
  const tripId = await arrange.createTrip({ name: `Assistant ${uniqueSuffix()}` });
  await openTrip(page, tripId);
  await openGroamAssistant(page);
});
