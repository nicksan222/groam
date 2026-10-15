import {
  addActivity,
  addStop,
  applyIdea,
  arrange,
  environment,
  expectPath,
  openAppPath,
  openIdea,
  openIdeaFromList,
  openSharedTrip,
  requestIdeaReview,
  saveSevenDayRange,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/testing/open-app';

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
  await openAppPath(`trips/${tripId}/itinerary`);
  const planner = page.getByRole('region', { name: 'Day planner' });
  await expect.element(planner).toBeVisible();
  await expect.element(planner).not.toMatchTextContent('Waterfront walk');
  await openIdeaFromList({ title: ideaName }, 'continue');
  await requestIdeaReview();

  // A second person reviews: their own screens are covered by view tests, so they act through the backend.
  await arrange.approveIdea({ ideaName, memberEmail: reviewer.email, tripId: sharedTripId });

  await openAppPath(`trips/${tripId}/itinerary`);
  await expect.element(planner).toBeVisible();
  await expect.element(planner).not.toMatchTextContent('Waterfront walk');
  await openIdeaFromList({ title: ideaName }, 'view');
  await applyIdea();
  await openSharedTrip();
  await openAppPath(`trips/${tripId}/itinerary`);
  await expectPath(new RegExp(`/trips/${tripId}/itinerary`, 'u'));
  await expect.element(planner).toMatchTextContent('Waterfront walk');
});
