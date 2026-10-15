import {
  addIdea,
  approveAndApplyIdea,
  arrange,
  by,
  currentPath,
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
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/testing/open-app';

test('keeps ordinary edits quiet and resolves real competing ideas with mixed choices', async () => {
  const suffix = uniqueSuffix('detail-conflict');
  const initialName = `Original plan ${suffix}`;
  const sharedName = `Updated shared plan ${suffix}`;
  const ideaName = `details/mixed-resolution-${suffix}`;
  const ideaTripName = `Idea plan ${suffix}`;
  const ideaNotes = `Idea dates ${suffix}`;

  const tripId = await arrange.createTrip({ name: initialName });
  await openApp();
  await openTrip(tripId);
  await addIdea({ name: ideaName });
  await updateTrip({ dateNotes: ideaNotes, name: ideaTripName });
  await openTripSection('itinerary');
  await expect.poll(() => by(ids.itineraryDetailsResolve).elements().length).toBe(0);
  await expect
    .poll(() => page.getByText('The shared trip has changed since you started').elements().length)
    .toBe(0);
  await requestIdeaReview();
  const firstIdeaUrl = currentPath();

  const competing = await arrange.startIdea({ name: `details/competing-${suffix}`, tripId });
  await arrange.updateTrip({
    dateNotes: 'Shared dates',
    name: sharedName,
    tripId: competing.workingTripId
  });
  await arrange.requestIdeaReview(competing.proposalId);
  await openIdea({ proposalId: competing.proposalId, tripId });
  await openIdeaComparison();
  await approveAndApplyIdea();

  await openAppPath(firstIdeaUrl);
  await approveAndApplyIdea();
  await openIdeaComparison();
  await expect
    .element(page.getByRole('heading', { name: 'Trip details differ from the shared trip' }))
    .toBeVisible();
  await resolveTripDetailConflict({
    choices: [{ field: 'Trip name', source: 'shared' }],
    expectedBranches: [{ field: 'Trip name', idea: ideaTripName, shared: sharedName }],
    expectedPreview: [sharedName, ideaNotes],
    expectedSides: [sharedName, ideaName]
  });
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', sharedName);
  await expect.poll(() => by(ids.itineraryDetailsResolve).elements().length).toBe(0);
  await reloadAppPage();
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', sharedName);
  await expect.poll(() => by(ids.itineraryDetailsResolve).elements().length).toBe(0);
  await openIdeaComparison();
  await expect
    .poll(() => page.getByText('The shared trip has changed since you started').elements().length)
    .toBe(0);
  await expect.element(page.getByText(ideaNotes)).toBeVisible();
});
