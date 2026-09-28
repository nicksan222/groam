import {
  addFirstDestination,
  addIdea,
  by,
  createTrip,
  ids,
  mockDestinationSearch,
  openDestinationDetails,
  openTripSection,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('starts an idea and adds the first destination through one composer', async ({ page }) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await signIn(page);
  await createTrip(page, { name: `First destination ${uniqueSuffix()}` });
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
