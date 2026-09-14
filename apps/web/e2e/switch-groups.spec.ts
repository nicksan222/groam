import {
  by,
  createGroup,
  createTrip,
  deleteCurrentGroup,
  ids,
  openTrips,
  signIn,
  switchGroup,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('group switching isolates reactive Convex data', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const organizationName = `Isolation ${uniqueSuffix()}`;
  const tripName = `Only in ${organizationName}`;

  await createGroup(page, { name: organizationName });

  await createTrip(page, { name: tripName });
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);

  await switchGroup(page, { name: 'Groam Demo' });
  await expect(tripCard(page, tripName)).toHaveCount(0);

  await switchGroup(page, { name: organizationName });
  await openTrips(page);
  await expect(tripCard(page, tripName)).toBeVisible();

  await deleteCurrentGroup(page, { fallbackGroupName: 'Groam Demo' });
});
