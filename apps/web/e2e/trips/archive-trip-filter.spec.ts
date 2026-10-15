import {
  archiveTrip,
  filterTripsByStatus,
  openAppPath,
  openTrip,
  openTripFromList,
  openTrips,
  restoreTrip,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('archived trips leave the active list and return after restoring', async ({
  arrange,
  page
}) => {
  test.setTimeout(90_000);
  const tripName = `Archive filter ${uniqueSuffix()}`;
  await openTrip(page, await arrange.createTrip({ name: tripName }));
  await archiveTrip(page);

  await openAppPath(page, 'trips');
  await filterTripsByStatus(page, 'active');
  await expect(tripCard(page, tripName)).toHaveCount(0);
  await filterTripsByStatus(page, 'archived');
  await expect(tripCard(page, tripName)).toBeVisible();

  await openTripFromList(page, tripName);
  await restoreTrip(page);
  await openTrips(page);
  await filterTripsByStatus(page, 'active');
  await expect(tripCard(page, tripName)).toBeVisible();
});
