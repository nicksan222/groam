import {
  addFirstDestination,
  addIdea,
  arrange,
  by,
  destinationCard,
  environment,
  expectGone,
  expectPath,
  ids,
  openDestinationDetails,
  openTrip,
  openTripSection,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('starts an idea and adds the first destination through one composer', async () => {
  await environment.mockDestinationSearch();
  await openApp();
  await openTrip(await arrange.createTrip({ name: `First destination ${uniqueSuffix()}` }));
  await expectGone(by(ids.tripActionAddStop));
  await addIdea({ name: `First stop idea ${uniqueSuffix()}` });
  await openTripSection('itinerary');

  await expectGone(by(ids.startIdeaDialog));
  await expectPath(/\/trips\/[^/]+\/ideas\/[^/]+\/itinerary/u);
  await addFirstDestination({
    initialSearch: 'Lisbon',
    name: 'Porto',
    notes: 'Food and old town'
  });
  await openDestinationDetails('Porto, Portugal');
  await expectPath(/\/trips\/[^/]+\/ideas\/[^/]+\/itinerary/u);
  await expect.element(destinationCard('Porto, Portugal')).toBeVisible();
});
