import {
  addActivity,
  addStop,
  applyIdea,
  approveIdea,
  mockDestinationSearch,
  openAppPath,
  openIdea,
  openIdeaFromList,
  openItinerary,
  openSharedTrip,
  requestIdeaReview,
  saveSevenDayRange,
  signInAs,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('an approved idea activity appears on the shared itinerary only after applying it', async ({
  arrange,
  newSignedOutPage,
  page
}) => {
  test.setTimeout(180_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const reviewerAccount = await arrange.addMember('activity-reviewer');
  const sharedTripId = await arrange.createTrip({ name: `Applied itinerary ${suffix}` });
  const ideaName = `Add a waterfront walk ${suffix}`;
  const idea = await arrange.startIdea({ name: ideaName, tripId: sharedTripId });
  const { tripId } = await openIdea(page, { proposalId: idea.proposalId, tripId: sharedTripId });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'River', startDay: '4', endDay: '5' });
  await addActivity(page, { destination: 'Porto, Portugal', title: 'Waterfront walk' });
  await openSharedTrip(page);
  await openAppPath(page, `trips/${tripId}/itinerary`);
  await expect(page.getByRole('region', { name: 'Day planner' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Day planner' })).not.toContainText(
    'Waterfront walk'
  );
  await openIdeaFromList(page, ideaName);
  await requestIdeaReview(page);

  const reviewer = await newSignedOutPage();
  await signInAs(reviewer, reviewerAccount);
  await openIdeaFromList(reviewer, ideaName);
  await approveIdea(reviewer);

  await openAppPath(page, `trips/${tripId}/itinerary`);
  await expect(page.getByRole('region', { name: 'Day planner' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Day planner' })).not.toContainText(
    'Waterfront walk'
  );
  await openIdeaFromList(page, ideaName);
  await applyIdea(page);
  await openSharedTrip(page);
  await openAppPath(page, `trips/${tripId}/itinerary`);
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/itinerary`, 'u'));
  await expect(page.getByRole('region', { name: 'Day planner' })).toContainText('Waterfront walk');
});
