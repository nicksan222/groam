import {
  arrange,
  by,
  createGroup,
  createTripFromTrips,
  deleteCurrentGroup,
  expectCurrentGroup,
  expectGone,
  ids,
  openTrips,
  switchGroup,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('group switching isolates reactive Convex data', async () => {
  const { groupName: homeGroupName } = await arrange.account();
  await openApp();
  const organizationName = `Isolation ${uniqueSuffix()}`;
  const tripName = `Only in ${organizationName}`;

  await createGroup({ name: organizationName });

  await createTripFromTrips({ name: tripName }, 'empty');
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);

  await switchGroup({ name: homeGroupName });
  await expectCurrentGroup(homeGroupName);
  // The trip switcher follows the group: this group's trip is not the current one here.
  await expect.element(by(ids.tripSwitcher)).not.toHaveAttribute('data-trip-name', tripName);
  await expectGone(tripCard(tripName));

  await switchGroup({ name: organizationName });
  await openTrips();
  await expect.element(tripCard(tripName)).toBeVisible();

  await deleteCurrentGroup({ fallbackGroupName: homeGroupName });
});
