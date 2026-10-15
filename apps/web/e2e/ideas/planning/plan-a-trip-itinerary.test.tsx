import {
  addActivity,
  addStop,
  arrange,
  editActivity,
  environment,
  openIdea,
  openTrips,
  saveSevenDayRange,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/testing/open-app';

test('plans a trip itinerary on an idea working copy', async () => {
  await environment.mockDestinationSearch();
  const suffix = uniqueSuffix();
  const tripName = `Itinerary ${suffix}`;
  const ideaName = `dates/seven-day-plan-${suffix}`;

  const tripId = await arrange.createTrip({ name: tripName });
  const idea = await arrange.startIdea({ name: ideaName, tripId });
  await arrange.updateTrip({ budgetAmount: 1800, tripId: idea.workingTripId });
  await openApp();
  await openIdea({ proposalId: idea.proposalId, tripId });
  await saveSevenDayRange();

  await addStop({
    endDay: '3',
    first: true,
    name: 'Lisbon',
    notes: 'Food and old town',
    startDay: '1'
  });
  await addStop({ endDay: '5', name: 'Porto', notes: 'River and cellars', startDay: '4' });

  await addActivity({
    destination: 'Lisbon, Portugal',
    address: 'Miradouro da Senhora do Monte, Lisbon, Portugal',
    notes: 'Meet by the tram stop',
    title: 'Sunset viewpoint walk'
  });
  await addActivity({
    destination: 'Lisbon, Portugal',
    address: 'Rua da Bica 18, Lisbon, Portugal',
    title: 'Dinner reservation'
  });

  await editActivity({
    address: 'Miradouro da Senhora do Monte, 1170-107 Lisbon, Portugal',
    title: 'Sunset viewpoint walk'
  });
  await expect.element(page.getByRole('region', { name: 'Day 1 schedule' })).toBeVisible();
  await expect.element(page.getByRole('region', { name: 'Day 7 schedule' })).toBeVisible();
  await openTrips();
});
