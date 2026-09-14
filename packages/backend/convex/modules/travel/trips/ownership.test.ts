import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import {
  openTripDraft,
  setupWritableTrip,
  tripActivityInput,
  tripInput,
  tripLocationInput
} from '#testing/trips';

test('trip-owned resources cannot be edited or deleted through another trip', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const otherSharedTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Other trip' })
  });
  const { workingTripId: otherTripId } = await openTripDraft(owner, otherSharedTripId);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput(),
    tripId
  });
  const transferId = await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: { mode: 'flight' },
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      dayNotes: 'Move this stop',
      destinationId,
      tripId: otherTripId
    })
  ).rejects.toThrow('Trip destination not found');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.remove.run, {
      activityId,
      tripId: otherTripId
    })
  ).rejects.toThrow('Itinerary activity not found');
  await expect(
    owner.client.mutation(api.routes.trips.transfers.remove.run, {
      transferId,
      tripId: otherTripId
    })
  ).rejects.toThrow('Trip boundary transfer not found');

  await expect(
    owner.client.run(async (ctx) => ({
      activity: await ctx.db.get('tripDestinationActivities', activityId),
      destination: await ctx.db.get('tripDestinations', destinationId),
      transfer: await ctx.db.get('tripBoundaryTransfers', transferId)
    }))
  ).resolves.toMatchObject({
    activity: { tripId },
    destination: { tripId },
    transfer: { tripId }
  });
});
