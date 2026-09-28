import {
  archiveTrip,
  createTrip,
  filterTripsByStatus,
  openAppPath,
  openTripFromList,
  openTrips,
  restoreTrip,
  signIn,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('archived trips leave the active list and return after restoring', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const tripName = `Archive filter ${uniqueSuffix()}`;
  await createTrip(page, { name: tripName });
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
