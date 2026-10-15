import {
  archiveTrip,
  by,
  createTripFromTrips,
  ids,
  openTrips,
  restoreTrip,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('creates, archives, restores, and lists a destination-optional trip', async () => {
  await openApp();
  const tripName = `Beach idea ${uniqueSuffix()}`;

  await createTripFromTrips({ dateNotes: 'Late July', durationDays: 8, name: tripName });
  await expect
    .element(by(ids.tripDestination))
    .toHaveAttribute('data-destination-status', 'undecided');
  await expect.element(by(ids.tripRole)).toHaveAttribute('data-role', 'organizer');

  await archiveTrip();
  await restoreTrip();
  await expect.element(by(ids.tripArchive)).toBeVisible();

  await openTrips();
  await expect.element(tripCard(tripName)).toBeVisible();
});
