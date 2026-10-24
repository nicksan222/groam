import {
  arrange,
  by,
  currentPath,
  expectPath,
  ids,
  openTrip,
  openTripSection,
  uniqueSuffix
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('opens a trip on the Plan tab and switches between the trip tabs', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Tabs trip ${suffix}` });
  await openApp();
  await openTrip(tripId);

  // The trip lands on its Plan, read day by day.
  await expectPath(/\/trips\/[a-z]{6}\/plan$/u);
  await expect.element(by(ids.tripPlanPage)).toBeVisible();

  // Switching tabs only swaps the body: the compact header keeps the same DOM node.
  const heading = by(ids.tripHeading).element();

  for (const section of ['calendar', 'ideas', 'issues', 'polls', 'packing', 'activity'] as const) {
    await openTripSection(section);
    expect(currentPath()).toMatch(new RegExp(`/trips/[a-z]{6}/${section}$`, 'u'));
    await openTripSection('plan');
    expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/plan$/u);
    expect(by(ids.tripHeading).element()).toBe(heading);
  }
});
