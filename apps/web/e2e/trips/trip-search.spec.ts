import { openApp, searchTrips, tripCard, uniqueSuffix } from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('trip search only shows matching plans and clearing it restores the list', async ({
  arrange,
  page
}) => {
  test.setTimeout(90_000);
  const suffix = uniqueSuffix();
  const first = `Lisbon search ${suffix}`;
  const second = `Porto search ${suffix}`;
  await arrange.createTrip({ name: first });
  await arrange.createTrip({ name: second });
  await openApp(page);

  await searchTrips(page, first);
  await expect(tripCard(page, first)).toBeVisible();
  await expect(tripCard(page, second)).toHaveCount(0);
  await searchTrips(page, '');
  await expect(tripCard(page, first)).toBeVisible();
  await expect(tripCard(page, second)).toBeVisible();
});
