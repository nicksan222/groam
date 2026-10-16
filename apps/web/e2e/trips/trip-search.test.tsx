import {
  arrange,
  expectGone,
  searchTrips,
  tripCard,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/testing/open-app';

test('trip search only shows matching plans and clearing it restores the list', async () => {
  const suffix = uniqueSuffix();
  const first = `Lisbon search ${suffix}`;
  const second = `Porto search ${suffix}`;
  await arrange.createTrip({ name: first });
  await arrange.createTrip({ name: second });
  await openApp();

  await searchTrips(first);
  await expect.element(tripCard(first)).toBeVisible();
  await expectGone(tripCard(second));
  await searchTrips('');
  await expect.element(tripCard(first)).toBeVisible();
  await expect.element(tripCard(second)).toBeVisible();
});
