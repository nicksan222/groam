import {
  arrange,
  by,
  createGroup,
  createTripFromTrips,
  deleteCurrentGroup,
  ids,
  openTrips,
  switchGroup,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('group switching isolates reactive Convex data', async () => {
  const { groupName: homeGroupName } = await arrange.account();
  await openApp();
  const organizationName = `Isolation ${uniqueSuffix()}`;
  const tripName = `Only in ${organizationName}`;

  await createGroup({ name: organizationName });

  await createTripFromTrips({ name: tripName });
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);

  await switchGroup({ name: homeGroupName });
  await expect.element(tripCard(tripName)).not.toBeInTheDocument();

  await switchGroup({ name: organizationName });
  await openTrips();
  await expect.element(tripCard(tripName)).toBeVisible();

  await deleteCurrentGroup({ fallbackGroupName: homeGroupName });
});
