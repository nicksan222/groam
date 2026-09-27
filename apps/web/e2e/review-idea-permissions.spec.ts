import {
  acceptGroupInvitation,
  addActivity,
  addIdea,
  addStop,
  createTrip,
  ids,
  inviteGroupMember,
  mockDestinationSearch,
  openAppPath,
  openIdeaFromList,
  openIdeaItinerary,
  openTripSection,
  requestIdeaReview,
  saveSevenDayRange,
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
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  const tripId = await createTrip(page, { name: `Read-only review ${suffix}` });
  const ideaName = `Review-only idea ${suffix}`;
  const proposalId = await addIdea(page, { name: ideaName });
  await saveSevenDayRange(page);
  await openTripSection(page, 'itinerary');
  await addStop(page, { name: 'Porto', notes: 'River walk', startDay: '1', endDay: '3' });
  await addActivity(page, { destination: 'Porto, Portugal', title: 'Riverside walk' });
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
    // A direct itinerary URL must not expose the editor to a reviewer either.
    await openAppPath(reviewer, `trips/${tripId}/ideas/${proposalId}/itinerary`);
    await expect(reviewer.getByText('Riverside walk', { exact: true })).toBeVisible();
    await expect(reviewer.getByRole('region', { name: 'Itinerary editor' })).toHaveCount(0);
    await expect(reviewer.getByRole('button', { name: 'Add a plan' })).toHaveCount(0);
    await expect(reviewer.getByRole('button', { name: 'Edit Riverside walk' })).toHaveCount(0);

    await openIdeaFromList(page, ideaName);
    await openIdeaItinerary(page);
    await expect(page.getByRole('button', { name: 'Edit Riverside walk' })).toBeVisible();
  } finally {
    await reviewerContext.close();
  }
});
