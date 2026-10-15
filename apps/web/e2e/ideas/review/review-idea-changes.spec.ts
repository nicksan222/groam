import {
  by,
  ids,
  openIdea,
  returnIdeaToEditing,
  reviewIdeaChange,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('reviews an edit, comments without blocking it, and returns to editing on mobile', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Review polish ${suffix}` });
  const idea = await arrange.startIdea({ name: `Review dates ${suffix}`, tripId });
  const note = `Prefer a relaxed weekend ${suffix}`;
  await arrange.updateTrip({ dateNotes: note, tripId: idea.workingTripId });
  await openIdea(page, { proposalId: idea.proposalId, tripId });
  const comment = `Looks good, keeping this flexible. ${suffix}`;
  await reviewIdeaChange(page, { change: note, comment });
  await expect(by(page, ids.requestReview)).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await returnIdeaToEditing(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
