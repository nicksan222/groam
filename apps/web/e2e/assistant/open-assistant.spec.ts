import {
  completeOnboarding,
  createTrip,
  openGroamAssistant,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { test } from '@playwright/test';

test('opens Groam AI on a trip with a ready prompt', async ({ page }) => {
  test.setTimeout(120_000);
  // A fresh user keeps the per-user AI thread rate limit out of the way.
  await completeOnboarding(page, { groupName: `Assistant ${uniqueSuffix()}` });
  await createTrip(page, { name: `Assistant ${uniqueSuffix()}` });
  await openGroamAssistant(page);
});
