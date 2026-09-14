import {
  addIdea,
  approveAndApplyIdea,
  by,
  createTrip,
  ids,
  openAppPath,
  openIdeaComparison,
  openTripSection,
  reloadAppPage,
  requestIdeaReview,
  resolveTripDetailConflict,
  signIn,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('keeps ordinary edits quiet and resolves real competing ideas with mixed choices', async ({
  page
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix('detail-conflict');
  const initialName = `Original plan ${suffix}`;
  const sharedName = `Updated shared plan ${suffix}`;
  const ideaName = `details/mixed-resolution-${suffix}`;
  const ideaTripName = `Idea plan ${suffix}`;
  const ideaNotes = `Idea dates ${suffix}`;

  const tripId = await createTrip(page, { name: initialName });
  await addIdea(page, { name: ideaName });
  await updateTrip(page, { dateNotes: ideaNotes, name: ideaTripName });
  await openTripSection(page, 'itinerary');
  await expect(by(page, ids.itineraryDetailsResolve)).toHaveCount(0);
  await expect(page.getByText('The shared trip has changed since you started')).toHaveCount(0);
  await requestIdeaReview(page);
  const firstIdeaUrl = page.url();

  await openAppPath(page, `trips/${tripId}/ideas`);
  await addIdea(page, { name: `details/competing-${suffix}` });
  await updateTrip(page, { dateNotes: 'Shared dates', name: sharedName });
  await requestIdeaReview(page);
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
