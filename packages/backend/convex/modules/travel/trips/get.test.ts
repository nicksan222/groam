import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import {
  paginationArgs,
  setupGroup,
  setupTrip,
  setupWritableTrip,
  tripActivityInput,
  tripLocationInput
} from '#testing/trips';

test('gives every group member visibility with role-based capabilities', async () => {
  const { owner, tripId, users } = await setupTrip(3);

  const expected = {
    activity: [
      {
        actorName: 'Test Person',
        actorUserId: owner.userId,
        type: 'trip_created'
      }
    ],
    destinations: [],
    permissions: {
      canArchive: true,
      canEdit: false,
      canPropose: true,
      canRestore: false,
      isReadOnly: true
    }
  };
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject(
    expected
  );
  for (const user of users) {
    await expect(user.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      ...expected,
      permissions: {
        canArchive: false,
        canEdit: false,
        canPropose: true,
        canRestore: false,
        isReadOnly: true
      },
      role: 'participant'
    });
  }
});

test('automatically grants newly joined group members access to existing trips', async () => {
  const { addUser, tripId } = await setupTrip(0);
  const newMember = await addUser('New group member');

  await expect(newMember.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject(
    {
      id: tripId,
      permissions: { canEdit: false, canPropose: true },
      role: 'participant'
    }
  );
  await expect(
    newMember.client.query(api.routes.trips.list.run, paginationArgs)
  ).resolves.toMatchObject({ page: [{ id: tripId }] });
});

test('reports missing and cross-workspace trip links without loading details', async () => {
  const { owner, tripId } = await setupTrip(0);
  const { owner: outsider } = await setupGroup();

  await expect(outsider.client.query(api.routes.trips.find.run, { tripId })).resolves.toBeNull();
  await owner.client.run((ctx) => ctx.db.delete('trips', tripId));
  await expect(owner.client.query(api.routes.trips.find.run, { tripId })).resolves.toBeNull();
});

test('returns N destinations with each destination’s N ordered activities', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationCount = 3;
  const activitiesPerDestination = 4;

  for (let destinationIndex = 0; destinationIndex < destinationCount; destinationIndex += 1) {
    const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({
        latitude: 38 + destinationIndex,
        longitude: -9 - destinationIndex,
        name: `Destination ${destinationIndex + 1}`,
        placeId: `place-${destinationIndex + 1}`
      }),
      tripId
    });
    for (let activityIndex = 0; activityIndex < activitiesPerDestination; activityIndex += 1) {
      await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
        destinationId,
        input: tripActivityInput({
          dayNumber: activityIndex + 1,
          title: `Destination ${destinationIndex + 1} activity ${activityIndex + 1}`
        }),
        tripId
      });
    }
  }

  const trip = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(trip.destinations).toHaveLength(destinationCount);
  for (const [destinationIndex, destination] of trip.destinations.entries()) {
    expect(destination.position).toBe(destinationIndex);
    expect(destination.activities).toHaveLength(activitiesPerDestination);
    expect(destination.activities.map(({ position }) => position)).toEqual([0, 1, 2, 3]);
    expect(destination.activities.map(({ title }) => title)).toEqual(
      Array.from(
        { length: activitiesPerDestination },
        (_, activityIndex) => `Destination ${destinationIndex + 1} activity ${activityIndex + 1}`
      )
    );
  }
});
