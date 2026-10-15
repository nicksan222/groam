import {
  approveIdea,
  by,
  ids,
  openIdea,
  openIdeaComparison,
  openIdeaFromList,
  revokeIdeaApproval,
  signInAs,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('revoking the only approval prevents an idea from being applied', async ({
  arrange,
  newSignedOutPage,
  page
}) => {
  test.setTimeout(180_000);
  const suffix = uniqueSuffix();
  const ideaName = `Approval reversal ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Review reversal ${suffix}` });
  const idea = await arrange.startIdea({ name: ideaName, tripId });
  await arrange.updateTrip({ dateNotes: 'More time by the river', tripId: idea.workingTripId });
  await arrange.requestIdeaReview(idea.proposalId);
  const reviewerAccount = await arrange.addMember('approval-reversal');

  const reviewer = await newSignedOutPage();
  await signInAs(reviewer, reviewerAccount);
  await openIdeaFromList(reviewer, ideaName);
  await approveIdea(reviewer);
  await openIdea(page, { proposalId: idea.proposalId, tripId });
  await openIdeaComparison(page);
  await expect(by(page, ids.applyIdea).first()).toBeEnabled();

  await revokeIdeaApproval(reviewer);
  await expect(by(reviewer, ids.approveIdea).first()).toHaveText(/Approve/u);
  await expect(by(page, ids.applyIdea).first()).toBeDisabled();

  await approveIdea(reviewer);
  await expect(by(page, ids.applyIdea).first()).toBeEnabled();
});
