import {
  addFirstDestination,
  addIdea,
  by,
  ids,
  mockDestinationSearch,
  openDestinationDetails,
  openTrip,
  openTripSection,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('starts an idea and adds the first destination through one composer', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await openTrip(page, await arrange.createTrip({ name: `First destination ${uniqueSuffix()}` }));
  await expect(by(page, ids.tripActionAddStop)).toHaveCount(0);
  await addIdea(page, { name: `First stop idea ${uniqueSuffix()}` });
  await openTripSection(page, 'itinerary');

  await expect(by(page, ids.startIdeaDialog)).toHaveCount(0);
  await expect(page).toHaveURL(/\/trips\/[^/]+\/ideas\/[^/]+\/itinerary/u, {
    timeout: 20_000
  });
  await addFirstDestination(page, {
    initialSearch: 'Lisbon',
    name: 'Porto',
    notes: 'Food and old town'
  });
  await openDestinationDetails(page, 'Porto, Portugal');
  await expect(page).toHaveURL(/\/trips\/[^/]+\/ideas\/[^/]+\/itinerary/u);
});
