import {
  addIdea,
  by,
  createTrip,
  ids,
  openIdeaComparison,
  signIn,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('an empty idea cannot be submitted until it contains a change', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Empty proposal ${suffix}` });
  await addIdea(page, { name: `Fill this idea ${suffix}` });
  await openIdeaComparison(page);
  await expect(by(page, ids.requestReview).first()).toBeDisabled();
  await expect(page.getByText('Add a change before you can send this to the group.')).toBeVisible();

  await updateTrip(page, { dateNotes: 'Travel after the holidays' });
  await openIdeaComparison(page);
  await expect(by(page, ids.requestReview).first()).toBeEnabled();
});
