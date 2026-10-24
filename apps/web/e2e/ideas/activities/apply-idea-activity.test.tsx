import {
  addActivity,
  addStop,
  applyIdea,
  arrange,
  by,
  environment,
  expectPath,
  ids,
  openAppPath,
  openIdea,
  openIdeaFromQueue,
  openSharedTrip,
  requestIdeaReview,
  saveSevenDayRange,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('an approved idea activity appears on the shared itinerary only after applying it', async () => {
  await environment.mockDestinationSearch();
  const suffix = uniqueSuffix();
  const reviewer = await arrange.addMember('activity-reviewer');
  const sharedTripId = await arrange.createTrip({ name: `Applied itinerary ${suffix}` });
  const ideaName = `Add a waterfront walk ${suffix}`;
  const idea = await arrange.startIdea({ name: ideaName, tripId: sharedTripId });
  await openApp();
  const { tripId } = await openIdea({ proposalId: idea.proposalId, tripId: sharedTripId });
  await saveSevenDayRange();
  await addStop({ first: true, name: 'Porto', notes: 'River', startDay: '4', endDay: '5' });
  await addActivity({ destination: 'Porto, Portugal', title: 'Waterfront walk' });
  await openSharedTrip();
  await openAppPath(`trips/${tripId}/plan`);
  const planner = by(ids.tripPlanPage);
  await expect.element(planner).toBeVisible();
  await expect.element(planner).not.toMatchTextContent('Waterfront walk');
  await openIdeaFromQueue(tripId, ideaName);
  await requestIdeaReview();

  // A second person reviews: their own screens are covered by view tests, so they act through the backend.
  await arrange.approveIdea({ ideaName, memberEmail: reviewer.email, tripId: sharedTripId });

  await openAppPath(`trips/${tripId}/plan`);
  await expect.element(planner).toBeVisible();
  await expect.element(planner).not.toMatchTextContent('Waterfront walk');
  await openIdeaFromQueue(tripId, ideaName);
  await applyIdea();
  await openSharedTrip();
  await openAppPath(`trips/${tripId}/plan`);
  await expectPath(new RegExp(`/trips/${tripId}/plan`, 'u'));
  await expect.element(planner).toMatchTextContent('Waterfront walk');
});
