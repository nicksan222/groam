import { describe, expect, test } from 'vitest';
import { nextActionFor } from '#convex/modules/travel/trips/ctx';
import type { Doc, Id } from '#convex-generated/dataModel';
import { setupGroup, setupTrip } from '#testing/trips';

function tripDoc(overrides: Partial<Doc<'trips'>> = {}): Doc<'trips'> {
  return {
    _creationTime: 0,
    _id: 'trip1' as Id<'trips'>,
    clientRequestId: 'test-request-id',
    creationFingerprint: 'fingerprint',
    creator: { userId: 'owner' },
    currency: 'USD',
    destination: { status: 'undecided' },
    name: 'Test trip',
    organizationId: 'org',
    updatedAt: 0,
    ...overrides
  } as Doc<'trips'>;
}

describe('trip context helpers', () => {
  test('nextActionFor surfaces planning blockers in priority order', () => {
    expect(nextActionFor(tripDoc())).toEqual({
      nextAction: 'Decide on a destination',
      outstandingActionCount: 2
    });
    expect(
      nextActionFor(
        tripDoc({
          destination: {
            coordinates: { latitude: 1, longitude: 2 },
            name: 'Lisbon',
            placeId: 'place',
            status: 'known'
          }
        })
      )
    ).toEqual({
      nextAction: 'Agree on the travel period',
      outstandingActionCount: 1
    });
    expect(
      nextActionFor(
        tripDoc({
          dateNotes: 'September',
          destination: {
            coordinates: { latitude: 1, longitude: 2 },
            name: 'Lisbon',
            placeId: 'place',
            status: 'known'
          }
        })
      )
    ).toEqual({
      nextAction: 'Continue planning together',
      outstandingActionCount: 0
    });
  });
});

test('loadTripContext scopes trips to the viewer organization', async () => {
  const { owner, tripId } = await setupTrip(0);
  const outsider = await setupGroup();

  await expect(
    owner.client.run(async (ctx) => {
      const { loadTripContext } = await import('#convex/modules/travel/trips/ctx');
      return (await loadTripContext(ctx, tripId)).trip._id;
    })
  ).resolves.toBe(tripId);
  await expect(
    outsider.owner.client.run(async (ctx) => {
      const { loadTripContext } = await import('#convex/modules/travel/trips/ctx');
      return await loadTripContext(ctx, tripId);
    })
  ).rejects.toThrow('Trip not found');
});
