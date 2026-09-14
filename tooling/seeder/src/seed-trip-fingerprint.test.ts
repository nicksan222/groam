import { expect, test } from 'vitest';
import { buildTripPlans } from './build-trip-plans';
import { seedActivityTitles } from './seed-activity-titles';
import { seedTripFingerprint, tripMatchesSeedFingerprint } from './seed-trip-fingerprint';

test('matches only trips where every seed destination has seed activities', () => {
  const plan = buildTripPlans(1)[0];
  if (!plan) throw new Error('Expected a seed trip plan');
  const fingerprint = seedTripFingerprint(plan);
  expect(fingerprint.activityTitles).toEqual([...seedActivityTitles]);
  expect(
    tripMatchesSeedFingerprint(
      {
        destinations: fingerprint.placeIds.map((placeId) => ({ activities: [], placeId }))
      },
      fingerprint
    )
  ).toBe(false);
  expect(
    tripMatchesSeedFingerprint(
      {
        destinations: fingerprint.placeIds.map((placeId) => ({
          activities: seedActivityTitles.map((title) => ({ title })),
          placeId
        }))
      },
      fingerprint
    )
  ).toBe(true);
});
