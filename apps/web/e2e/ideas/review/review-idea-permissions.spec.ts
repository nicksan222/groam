import {
  addActivity,
  addStop,
  approveIdea,
  ids,
  mockDestinationSearch,
  openAppPath,
  openIdea,
  openIdeaComparison,
  openIdeaFromList,
  openIdeaItinerary,
  openTripSection,
  requestIdeaReview,
  saveSevenDayRange,
  signInAs,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('reviewers can inspect and approve an idea but cannot edit its working copy', async ({
  arrange,
  newSignedOutPage,
  page
}) => {
  test.setTimeout(180_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const reviewerAccount = await arrange.addMember('reviewer');
  const tripId = await arrange.createTrip({ name: `Read-only review ${suffix}` });
  const ideaName = `Review-only idea ${suffix}`;
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openIdea(page, { proposalId, tripId });
  await saveSevenDayRange(page);
  await openTripSection(page, 'overview');
  await addStop(page, { name: 'Porto', notes: 'River walk', startDay: '1', endDay: '3' });
  await addActivity(page, { destination: 'Porto, Portugal', title: 'Riverside walk' });
  await updateTrip(page, { dateNotes: 'Prefer more time on the coast' });
  await requestIdeaReview(page);

  const reviewer = await newSignedOutPage();
  await signInAs(reviewer, reviewerAccount);
  await openIdeaFromList(reviewer, ideaName);
  await expect(reviewer.getByTestId(ids.ideaPrimaryAction)).toHaveText('Approve');
  await expect(reviewer.getByTestId(ids.tripActionEdit)).toHaveCount(0);
  await expect(reviewer.getByTestId(ids.ideaSectionCompare)).toBeVisible();
  // A direct itinerary URL must not expose the editor to a reviewer either.
  await openAppPath(reviewer, `trips/${tripId}/ideas/${proposalId}/itinerary`);
  await expect(reviewer.getByText('Riverside walk', { exact: true })).toBeVisible();
  await expect(reviewer.getByRole('region', { name: 'Itinerary editor' })).toHaveCount(0);
  await expect(reviewer.getByRole('button', { name: 'Add a plan' })).toHaveCount(0);
  await expect(reviewer.getByRole('button', { name: 'Add destination', exact: true })).toHaveCount(
    0
  );
  await expect(reviewer.getByRole('button', { name: 'Add to day', exact: true })).toHaveCount(0);
  await expect(reviewer.getByRole('button', { name: 'Edit Riverside walk' })).toHaveCount(0);
  await openIdeaComparison(reviewer);
  await approveIdea(reviewer);
  await expect(reviewer.getByTestId(ids.approveIdea).first()).toHaveText(/Remove approval/u);

  await openIdeaFromList(page, ideaName);
  await openIdeaItinerary(page);
  await expect(page.getByRole('button', { name: 'Edit Riverside walk' })).toBeVisible();
});
