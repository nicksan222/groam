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
import { openApp } from '@/journeys/open-app';

test('creates, archives, restores, and lists a destination-optional trip', async () => {
  await openApp();
  const tripName = `Beach idea ${uniqueSuffix()}`;

  await createTripFromTrips({ dateNotes: 'Late July', durationDays: 8, name: tripName }, 'empty');
  await expect
    .element(by(ids.tripDestination))
    .toHaveAttribute('data-destination-status', 'undecided');
  // Only an organizer gets the actions menu with archive.
  await expect.element(by(ids.tripActions)).toBeVisible();

  await archiveTrip();
  await restoreTrip();

  await openTrips();
  await expect.element(tripCard(tripName)).toBeVisible();
});
