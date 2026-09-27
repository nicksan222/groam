import {
  acceptGroupInvitation,
  addIdea,
  createTrip,
  ids,
  inviteGroupMember,
  openIdeaFromList,
  openTripSection,
  requestIdeaReview,
  signIn,
  uniqueSuffix,
  uniqueTestUser,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('reviewers can inspect and approve an idea but cannot edit its working copy', async ({
  browser,
  page
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Read-only review ${suffix}` });
  const ideaName = `Review-only idea ${suffix}`;
  await addIdea(page, { name: ideaName });
  await updateTrip(page, { dateNotes: 'Prefer more time on the coast' });
  await requestIdeaReview(page);

  const code = await inviteGroupMember(page);
  const reviewerContext = await browser.newContext();
  try {
    const reviewer = await reviewerContext.newPage();
    await acceptGroupInvitation(reviewer, code, uniqueTestUser('reviewer'));
    await openIdeaFromList(reviewer, ideaName);
    await expect(reviewer.getByTestId(ids.ideaPrimaryAction)).toHaveText('Approve');
    await expect(reviewer.getByTestId(ids.tripActionEdit)).toHaveCount(0);
    await expect(reviewer.getByTestId(ids.ideaSectionCompare)).toBeVisible();
    await openTripSection(reviewer, 'overview');
    await expect(reviewer.getByRole('button', { name: 'Add a plan' })).toHaveCount(0);
    await expect(reviewer.getByTestId(ids.tripSectionItinerary)).toHaveCount(0);

    await openIdeaFromList(page, ideaName);
    await expect(page.getByTestId(ids.tripActionEdit)).toBeVisible();
  } finally {
    await reviewerContext.close();
  }
});
