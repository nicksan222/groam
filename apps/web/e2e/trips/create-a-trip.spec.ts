import {
  archiveTrip,
  by,
  createTrip,
  ids,
  openApp,
  openTrips,
  restoreTrip,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('creates, archives, restores, and lists a destination-optional trip', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page);
  const tripName = `Beach idea ${uniqueSuffix()}`;

  await createTrip(page, {
    dateNotes: 'Late July',
    durationDays: 8,
    name: tripName
  });
  await expect(by(page, ids.tripDestination)).toHaveAttribute(
    'data-destination-status',
    'undecided'
  );
  await expect(by(page, ids.tripRole)).toHaveAttribute('data-role', 'organizer');

  await archiveTrip(page);
  await restoreTrip(page);
  await expect(by(page, ids.tripArchive)).toBeVisible();

  await openTrips(page);
  await expect(tripCard(page, tripName)).toBeVisible();
});
