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

test('opens a trip on the Board tab and switches between the trip tabs', async () => {
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Tabs trip ${suffix}` });
  await openApp();
  await openTrip(tripId);

  // The trip lands on the kanban board.
  await expectPath(/\/trips\/[a-z]{6}\/board$/u);
  await expect.element(by(ids.tripBoardScroller)).toBeVisible();

  // Switching tabs only swaps the body: the cover header keeps the same DOM node.
  const heading = by(ids.tripHeading).element();

  for (const section of ['overview', 'issues', 'ideas', 'activity'] as const) {
    await openTripSection(section);
    expect(currentPath()).toMatch(new RegExp(`/trips/[a-z]{6}/${section}$`, 'u'));
    await openTripSection('board');
    expect(currentPath()).toMatch(/\/trips\/[a-z]{6}\/board$/u);
    expect(by(ids.tripHeading).element()).toBe(heading);
  }
});
