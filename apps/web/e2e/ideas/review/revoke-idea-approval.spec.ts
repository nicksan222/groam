import {
  acceptGroupInvitation,
  addIdea,
  approveIdea,
  by,
  createTrip,
  ids,
  inviteGroupMember,
  openIdeaFromList,
  requestIdeaReview,
  revokeIdeaApproval,
  signIn,
  uniqueSuffix,
  uniqueTestUser,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('revoking the only approval prevents an idea from being applied', async ({
  browser,
  page
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const ideaName = `Approval reversal ${suffix}`;
  await createTrip(page, { name: `Review reversal ${suffix}` });
  await addIdea(page, { name: ideaName });
  await updateTrip(page, { dateNotes: 'More time by the river' });
  await requestIdeaReview(page);

  const code = await inviteGroupMember(page);
  const reviewerContext = await browser.newContext();
  try {
    const reviewer = await reviewerContext.newPage();
    await acceptGroupInvitation(reviewer, code, uniqueTestUser('approval-reversal'));
    await openIdeaFromList(reviewer, ideaName);
    await approveIdea(reviewer);
    await openIdeaFromList(page, ideaName);
    await expect(by(page, ids.applyIdea).first()).toBeEnabled();

    await revokeIdeaApproval(reviewer);
    await expect(by(reviewer, ids.approveIdea).first()).toHaveText(/Approve/u);
    await expect(by(page, ids.applyIdea).first()).toBeDisabled();

    await approveIdea(reviewer);
    await expect(by(page, ids.applyIdea).first()).toBeEnabled();
  } finally {
    await reviewerContext.close();
  }
});
