import { expect, test } from 'vite-plus/test';
import type { QueryCtx } from '#convex-generated/server';
import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import { stay, trip } from '#convex/modules/travel/targets/kinds/index';

test('the registry refuses duplicate kinds and lists tagged and attachable kinds', () => {
  expect(() => TripTargetKind.subscribe(stay)).toThrow("Trip target 'stay' is already registered");
  expect(TripTargetKind.of('stay')).toBe(stay);
  expect(TripTargetKind.of('missing')).toBeUndefined();
  expect(TripTargetKind.contextTagged().map((kind) => kind.key)).toContain('trip');
  expect(TripTargetKind.attachable().every((kind) => kind.attachable)).toBe(true);
});

test('base labels and details fall back to the kind name', async () => {
  expect(stay.key).toBe('stay');
  expect(stay.contextLabel({})).toBe('stay');
  expect(trip.contextLabel({ name: 'Lisbon' })).toBe('Lisbon');
  expect(stay.catalogDescription('Lisbon')).toBe('Lisbon');
  expect(stay.catalogDescription('Lisbon', { destinationName: 'Porto' })).toBe('Lisbon · Porto');
  await expect(stay.contextDetails({} as QueryCtx, {}, 'Hotel')).resolves.toEqual({
    label: 'Hotel'
  });
});
