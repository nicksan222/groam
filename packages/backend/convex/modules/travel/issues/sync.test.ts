import { expect, test } from 'vite-plus/test';
import { affectsConditions } from '#convex/modules/travel/issues/sync';

test.each([
  [{ destination: { status: 'undecided' as const } }, true],
  [{ startDate: undefined }, true],
  [{ duration: { totalDays: 3 } }, true],
  [{ updatedAt: 1 }, false],
  [{ cover: undefined, updatedAt: 1 }, false],
  [{ archive: { at: 1 }, updatedAt: 1 }, false]
])('patch %j re-checks conditions: %s', (patch, expected) => {
  expect(affectsConditions(patch)).toBe(expected);
});
