import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import {
  setupGroup,
  setupTransferEndpoints,
  setupWritableTrip,
  tripActivityInput,
  tripLocationInput
} from '#testing/trips';

test('assertBelongsToTrip accepts in-trip resources and rejects foreign ids', {
  timeout: 15_000
}, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const otherTripId = await owner.client.action(api.routes.trips.create.run, {
    input: {
      clientRequestId: crypto.randomUUID(),
      currency: 'USD',
      destination: { status: 'undecided' },
      name: 'Other trip'
    }
  });
  const { firstActivityId, firstDestinationId, secondActivityId, secondDestinationId } =
    await setupTransferEndpoints(owner, tripId, 'transfer-second-stop');
  const destinationId = firstDestinationId;
  const arrivalId = await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: { mode: 'flight' },
    tripId
  });
  const destinationTransferId = await owner.client.mutation(
    api.routes.trips.destinations.transfers.set.run,
    {
      fromDestinationId: firstDestinationId,
      input: { mode: 'train' },
      toDestinationId: secondDestinationId,
      tripId
    }
  );
  const activityTransferId = await owner.client.mutation(
    api.routes.trips.destinations.activities.transfers.set.run,
    {
      fromActivityId: firstActivityId,
      input: { mode: 'walk' },
      toActivityId: secondActivityId,
      tripId
    }
  );

  await expect(
    owner.client.run(async (ctx) => {
      const { loadTripContext } = await import('#convex/modules/travel/trips/ctx');
      const { TripTargets } = await import('#convex/modules/travel/targets/index');
      const trip = await loadTripContext(ctx, tripId);
      await TripTargets.assertBelongsToTrip(ctx, trip, { id: tripId, type: 'trip' });
      await TripTargets.assertBelongsToTrip(ctx, trip, { id: destinationId, type: 'destination' });
      await TripTargets.assertBelongsToTrip(ctx, trip, { id: firstActivityId, type: 'activity' });
      await TripTargets.assertBelongsToTrip(ctx, trip, {
        id: arrivalId,
        type: 'boundary_transfer'
      });
      await TripTargets.assertBelongsToTrip(ctx, trip, {
        id: destinationTransferId,
        type: 'destination_transfer'
      });
      await TripTargets.assertBelongsToTrip(ctx, trip, {
        id: activityTransferId,
        type: 'activity_transfer'
      });
    })
  ).resolves.toBeNull();

  await expect(
    owner.client.run(async (ctx) => {
      const { loadTripContext } = await import('#convex/modules/travel/trips/ctx');
      const { TripTargets } = await import('#convex/modules/travel/targets/index');
      const trip = await loadTripContext(ctx, tripId);
      await TripTargets.assertBelongsToTrip(ctx, trip, { id: otherTripId, type: 'trip' });
    })
  ).rejects.toThrow('Trip target not found');
});

test('attachment listing rejects targets from another trip in the same organization', async () => {
  const first = await setupWritableTrip(0);
  const second = await setupWritableTrip(0);
  const destinationId = await first.owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId: first.tripId
  });
  const activityId = await first.owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId,
      input: tripActivityInput(),
      tripId: first.tripId
    }
  );

  await expect(
    second.owner.client.query(api.routes.trips.attachments.list.run, {
      target: { id: activityId, type: 'activity' },
      tripId: second.tripId
    })
  ).rejects.toThrow('Trip target not found');
});

test('attachment listing rejects trips outside the viewer organization', async () => {
  const trip = await setupWritableTrip(0);
  const outsider = await setupGroup();
  const destinationId = await trip.owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId: trip.tripId
  });

  await expect(
    outsider.owner.client.query(api.routes.trips.attachments.list.run, {
      target: { id: destinationId, type: 'destination' },
      tripId: trip.tripId
    })
  ).rejects.toThrow('Trip not found');
});
