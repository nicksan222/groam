import {
  archiveTrip,
  arrange,
  expectGone,
  filterTripsByStatus,
  openAppPath,
  openTrip,
  openTripFromList,
  openTrips,
  restoreTrip,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('archived trips leave the active list and return after restoring', async () => {
  const tripName = `Archive filter ${uniqueSuffix()}`;
  await openApp();
  await openTrip(await arrange.createTrip({ name: tripName }));
  await archiveTrip();

  await openAppPath('trips');
  await filterTripsByStatus('active');
  await expectGone(tripCard(tripName));
  await filterTripsByStatus('archived');
  await expect.element(tripCard(tripName)).toBeVisible();

  await openTripFromList(tripName);
  await restoreTrip();
  await openTrips();
  await filterTripsByStatus('active');
  await expect.element(tripCard(tripName)).toBeVisible();
});
