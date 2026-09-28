import {
  addIdea,
  by,
  createTrip,
  ids,
  returnIdeaToEditing,
  reviewIdeaChange,
  signIn,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('reviews an edit, comments without blocking it, and returns to editing on mobile', async ({
  page
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Review polish ${suffix}` });
  await addIdea(page, { name: `Review dates ${suffix}` });
  const note = `Prefer a relaxed weekend ${suffix}`;
  await updateTrip(page, { dateNotes: note });
  const comment = `Looks good, keeping this flexible. ${suffix}`;
  await reviewIdeaChange(page, { change: note, comment });
  await expect(by(page, ids.requestReview)).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await returnIdeaToEditing(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
