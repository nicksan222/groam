import {
  by,
  createGroup,
  createTrip,
  deleteCurrentGroup,
  ids,
  openApp,
  openTrips,
  switchGroup,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('group switching isolates reactive Convex data', async ({ account, page }) => {
  test.setTimeout(90_000);
  await openApp(page);
  const homeGroupName = account.workspace.organizationName;
  const organizationName = `Isolation ${uniqueSuffix()}`;
  const tripName = `Only in ${organizationName}`;

  await createGroup(page, { name: organizationName });

  await createTrip(page, { name: tripName });
  await expect(by(page, ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);

  await switchGroup(page, { name: homeGroupName });
  await expect(tripCard(page, tripName)).toHaveCount(0);

  await switchGroup(page, { name: organizationName });
  await openTrips(page);
  await expect(tripCard(page, tripName)).toBeVisible();

  await deleteCurrentGroup(page, { fallbackGroupName: homeGroupName });
});
