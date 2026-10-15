import {
  addActivity,
  addStop,
  editActivity,
  mockDestinationSearch,
  openIdea,
  openItinerary,
  openTrips,
  saveSevenDayRange,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('plans a trip itinerary on an idea working copy', async ({ arrange, page }) => {
  test.setTimeout(180_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripName = `Itinerary ${suffix}`;
  const ideaName = `dates/seven-day-plan-${suffix}`;

  const tripId = await arrange.createTrip({ name: tripName });
  const idea = await arrange.startIdea({ name: ideaName, tripId });
  await arrange.updateTrip({ budgetAmount: 1800, tripId: idea.workingTripId });
  await openIdea(page, { proposalId: idea.proposalId, tripId });
  await saveSevenDayRange(page);

  await openItinerary(page);
  await addStop(page, { endDay: '3', name: 'Lisbon', notes: 'Food and old town', startDay: '1' });
  await addStop(page, { endDay: '5', name: 'Porto', notes: 'River and cellars', startDay: '4' });

  await addActivity(page, {
    destination: 'Lisbon, Portugal',
    address: 'Miradouro da Senhora do Monte, Lisbon, Portugal',
    notes: 'Meet by the tram stop',
    title: 'Sunset viewpoint walk'
  });
  await addActivity(page, {
    destination: 'Lisbon, Portugal',
    address: 'Rua da Bica 18, Lisbon, Portugal',
    title: 'Dinner reservation'
  });

  await editActivity(page, {
    address: 'Miradouro da Senhora do Monte, 1170-107 Lisbon, Portugal',
    title: 'Sunset viewpoint walk'
  });
  await expect(page.getByRole('tablist', { name: 'Planning tools' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choose a day' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Day 1 schedule', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Day 7 schedule', exact: true })).toBeVisible();
  await openTrips(page);
});
