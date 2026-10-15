import {
  addActivity,
  addStop,
  approveIdea,
  arrange,
  by,
  environment,
  expectGone,
  ids,
  openAppPath,
  openIdea,
  openIdeaComparison,
  openIdeaFromList,
  openIdeaItinerary,
  openTripSection,
  requestIdeaReview,
  saveSevenDayRange,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/testing/open-app';

test('reviewers can inspect and approve an idea but cannot edit its working copy', async () => {
  await environment.mockDestinationSearch();
  const suffix = uniqueSuffix();
  const reviewer = await arrange.addMember('reviewer');
  const tripId = await arrange.createTrip({ name: `Read-only review ${suffix}` });
  const ideaName = `Review-only idea ${suffix}`;
  const { proposalId } = await arrange.startIdea({ name: ideaName, tripId });
  await openApp();
  await openIdea({ proposalId, tripId });
  await saveSevenDayRange();
  await openTripSection('overview');
  await addStop({ name: 'Porto', notes: 'River walk', startDay: '1', endDay: '3' });
  await addActivity({ destination: 'Porto, Portugal', title: 'Riverside walk' });
  await updateTrip({ dateNotes: 'Prefer more time on the coast' });
  await requestIdeaReview();

  // The same browser now belongs to the reviewer, one person at a time.
  await openApp('/trips', { as: reviewer });
  await openIdeaFromList(ideaName);
  await expect.element(by(ids.ideaPrimaryAction)).toMatchTextContent('Approve');
  await expectGone(by(ids.tripActionEdit));
  await expect.element(by(ids.ideaSectionCompare)).toBeVisible();
  // A direct itinerary URL must not expose the editor to a reviewer either.
  await openAppPath(`trips/${tripId}/ideas/${proposalId}/itinerary`);
  await expect.element(page.getByText('Riverside walk')).toBeVisible();
  await expectGone(page.getByRole('region', { name: 'Itinerary editor' }));
  await expectGone(page.getByRole('button', { name: 'Add a plan' }));
  await expectGone(page.getByRole('button', { name: 'Add destination' }));
  await expectGone(page.getByRole('button', { name: 'Add to day' }));
  await expectGone(page.getByRole('button', { name: 'Edit Riverside walk' }));
  await openIdeaComparison();
  await approveIdea();
  await expect.element(by(ids.approveIdea).first()).toMatchTextContent(/Remove approval/u);

  await openApp();
  await openIdeaFromList(ideaName);
  await openIdeaItinerary();
  await expect.element(page.getByRole('button', { name: 'Edit Riverside walk' })).toBeVisible();
});
