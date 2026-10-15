import {
  by,
  ids,
  openIdea,
  openIdeaComparison,
  reloadAppPage,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('submitting an idea for review does not allow applying it without approval', async ({
  arrange,
  page
}) => {
  test.setTimeout(90_000);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Unapproved trip ${suffix}` });
  const idea = await arrange.startIdea({ name: `Unapproved idea ${suffix}`, tripId });
  await arrange.updateTrip({ dateNotes: 'A slower weekend', tripId: idea.workingTripId });
  await arrange.requestIdeaReview(idea.proposalId);
  await openIdea(page, { proposalId: idea.proposalId, tripId });
  await openIdeaComparison(page);

  await expect(by(page, ids.applyIdea).first()).toBeVisible();
  await expect(by(page, ids.applyIdea).first()).toBeDisabled();
  await reloadAppPage(page);
  await expect(by(page, ids.applyIdea).first()).toBeDisabled();
});
