import {
  createTrip,
  openTrips,
  searchTrips,
  signIn,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('trip search only shows matching plans and clearing it restores the list', async ({
  page
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const first = `Lisbon search ${suffix}`;
  const second = `Porto search ${suffix}`;
  await createTrip(page, { name: first });
  await createTrip(page, { name: second });
  await openTrips(page);

  await searchTrips(page, first);
  await expect(tripCard(page, first)).toBeVisible();
  await expect(tripCard(page, second)).toHaveCount(0);
  await searchTrips(page, '');
  await expect(tripCard(page, first)).toBeVisible();
  await expect(tripCard(page, second)).toBeVisible();
});
