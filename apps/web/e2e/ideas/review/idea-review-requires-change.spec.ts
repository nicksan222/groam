import {
  by,
  ids,
  openIdea,
  openIdeaComparison,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('an empty idea cannot be submitted until it contains a change', async ({ arrange, page }) => {
  test.setTimeout(90_000);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Empty proposal ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: `Fill this idea ${suffix}`, tripId });
  await openIdea(page, { proposalId, tripId });
  await openIdeaComparison(page);
  await expect(by(page, ids.requestReview).first()).toBeDisabled();
  await expect(page.getByText('Add a change before you can send this to the group.')).toBeVisible();

  await updateTrip(page, { dateNotes: 'Travel after the holidays' });
  await openIdeaComparison(page);
  await expect(by(page, ids.requestReview).first()).toBeEnabled();
});
