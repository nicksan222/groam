import {
  addActivity,
  addStop,
  arrange,
  by,
  continueActivityPlan,
  editActivity,
  environment,
  expectGone,
  ids,
  openAppPath,
  openIdea,
  openIdeaComparison,
  openIdeaFromList,
  openIdeaItinerary,
  openIssue,
  openSharedTrip,
  requestIdeaReview,
  returnIdeaToEditing,
  saveSevenDayRange,
  startActivityPlan,
  startIdeaFromIssue,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

// Component-level editor states (later-day entry points, add/edit/remove, address round trips) are
// left to view tests; these journeys keep the flows that cross pages.
test('plans an activity on an idea, compares it, and submits the change for review', async () => {
  await environment.mockDestinationSearch();
  const suffix = uniqueSuffix();
  const ideaName = `Review activity ${suffix}`;
  const tripId = await arrange.createTrip({ name: `Review itinerary ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openApp();
  await openIdea({ proposalId, tripId });
  await saveSevenDayRange();
  await addStop({ first: true, name: 'Lisbon', notes: 'Old town', startDay: '1', endDay: '3' });
  await addStop({ name: 'Porto', notes: 'River', startDay: '4', endDay: '5' });

  await startActivityPlan(5);
  await continueActivityPlan('Cruise on the Douro');
  await expect
    .element(page.getByRole('region', { name: 'Day 5 schedule' }))
    .toMatchTextContent('Cruise on the Douro');

  await openIdeaComparison();
  await expect.element(by(ids.compareSharedTrip)).toMatchTextContent('Cruise on the Douro');
  await returnIdeaToEditing();
  await editActivity({ title: 'Cruise on the Douro', address: 'Cais da Ribeira' });
  await openIdeaFromList({ title: ideaName }, 'continue');
  await openIdeaComparison();
  await requestIdeaReview();
  // Authors may still amend their working copy during review.
  await openIdeaFromList({ title: ideaName }, 'view');
  await expect.element(by(ids.ideaPrimaryAction)).toMatchTextContent('Approve');
  await openIdeaItinerary();
  await editActivity({ title: 'Cruise on the Douro', address: 'Cais da Ribeira 42' });
});

test('adds an activity to an issue-linked idea without changing the shared trip', async () => {
  await environment.mockDestinationSearch();
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Issue itinerary ${suffix}` });
  const issueId = await arrange.createIssue({
    title: `Plan a walk ${suffix}`,
    body: 'Add a day out to the trip',
    tripId
  });
  await openApp();
  await openIssue(issueId);
  const ideaName = await startIdeaFromIssue();
  await saveSevenDayRange();
  await openIdeaItinerary();
  await addStop({ first: true, name: 'Lisbon', notes: 'Walk', startDay: '1', endDay: '3' });
  await addActivity({ destination: 'Lisbon, Portugal', title: 'Walk through Alfama' });
  await openSharedTrip();
  await openAppPath(`trips/${tripId}/board`);
  await expect.element(page.getByRole('region', { name: /^Agreed plan/u })).toBeVisible();
  await expectGone(page.getByText('Walk through Alfama'));
  await openIdeaFromList({ name: ideaName }, 'continue');
  await openIdeaItinerary();
  await expect
    .element(page.getByRole('button', { name: 'Edit Walk through Alfama' }))
    .toBeVisible();
});
