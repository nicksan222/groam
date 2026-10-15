import {
  addIdea,
  approveAndApplyIdea,
  by,
  ids,
  openAppPath,
  openIdea,
  openIdeaComparison,
  openTrip,
  openTripSection,
  reloadAppPage,
  requestIdeaReview,
  resolveTripDetailConflict,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('keeps ordinary edits quiet and resolves real competing ideas with mixed choices', async ({
  arrange,
  page
}) => {
  test.setTimeout(180_000);
  const suffix = uniqueSuffix('detail-conflict');
  const initialName = `Original plan ${suffix}`;
  const sharedName = `Updated shared plan ${suffix}`;
  const ideaName = `details/mixed-resolution-${suffix}`;
  const ideaTripName = `Idea plan ${suffix}`;
  const ideaNotes = `Idea dates ${suffix}`;

  const tripId = await arrange.createTrip({ name: initialName });
  await openTrip(page, tripId);
  await addIdea(page, { name: ideaName });
  await updateTrip(page, { dateNotes: ideaNotes, name: ideaTripName });
  await openTripSection(page, 'itinerary');
  await expect(by(page, ids.itineraryDetailsResolve)).toHaveCount(0);
  await expect(page.getByText('The shared trip has changed since you started')).toHaveCount(0);
  await requestIdeaReview(page);
  const firstIdeaUrl = page.url();

  const competing = await arrange.startIdea({ name: `details/competing-${suffix}`, tripId });
  await arrange.updateTrip({
    dateNotes: 'Shared dates',
    name: sharedName,
    tripId: competing.workingTripId
  });
  await arrange.requestIdeaReview(competing.proposalId);
  await openIdea(page, { proposalId: competing.proposalId, tripId });
  await openIdeaComparison(page);
  await approveAndApplyIdea(page);

  await openAppPath(page, firstIdeaUrl);
  await approveAndApplyIdea(page);
  await openIdeaComparison(page);
  await expect(
    page.getByRole('heading', { name: 'Trip details differ from the shared trip' })
  ).toBeVisible();
  await resolveTripDetailConflict(page, {
    choices: [{ field: 'Trip name', source: 'shared' }],
    expectedBranches: [{ field: 'Trip name', idea: ideaTripName, shared: sharedName }],
    expectedPreview: [sharedName, ideaNotes],
    expectedSides: [sharedName, ideaName]
  });
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', sharedName);
  await expect(by(page, ids.itineraryDetailsResolve)).toHaveCount(0);
  await reloadAppPage(page);
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', sharedName);
  await expect(by(page, ids.itineraryDetailsResolve)).toHaveCount(0);
  await openIdeaComparison(page);
  await expect(page.getByText('The shared trip has changed since you started')).toHaveCount(0);
  await expect(page.getByText(ideaNotes, { exact: true })).toBeVisible();
});
