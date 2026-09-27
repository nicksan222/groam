import {
  acceptGroupInvitation,
  addActivity,
  addIdea,
  addStop,
  applyIdea,
  approveIdea,
  createTrip,
  inviteGroupMember,
  mockDestinationSearch,
  openIdeaFromList,
  openItinerary,
  openSharedTrip,
  openTripSection,
  requestIdeaReview,
  saveSevenDayRange,
  signIn,
  uniqueSuffix,
  uniqueTestUser
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('an approved idea activity appears on the shared itinerary only after applying it', async ({
  browser,
  page
}) => {
  test.setTimeout(180_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  const tripId = await createTrip(page, { name: `Applied itinerary ${suffix}` });
  const ideaName = `Add a waterfront walk ${suffix}`;
  await addIdea(page, { name: ideaName });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'River', startDay: '4', endDay: '5' });
  await addActivity(page, { destination: 'Porto, Portugal', title: 'Waterfront walk' });
  await openSharedTrip(page);
  await openTripSection(page, 'overview');
  await expect(page.getByText('Waterfront walk', { exact: true })).toHaveCount(0);
  await openIdeaFromList(page, ideaName);
  await requestIdeaReview(page);

  const code = await inviteGroupMember(page);
  const reviewerContext = await browser.newContext();
  try {
    const reviewer = await reviewerContext.newPage();
    await acceptGroupInvitation(reviewer, code, uniqueTestUser('activity-reviewer'));
    await openIdeaFromList(reviewer, ideaName);
    await approveIdea(reviewer);
  } finally {
    await reviewerContext.close();
  }

  await openIdeaFromList(page, ideaName);
  await applyIdea(page);
  await openSharedTrip(page);
  await openTripSection(page, 'overview');
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/overview`, 'u'));
  await expect(page.getByText('Waterfront walk', { exact: true })).toBeVisible();
});
