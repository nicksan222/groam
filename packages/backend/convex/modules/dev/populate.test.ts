import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import {
  setupGroup,
  setupTrip,
  tripActivityInput,
  tripInput,
  tripLocationInput
} from '#testing/trips';

test('create still seeds a primary destination without extra populate', {
  timeout: 10_000
}, async () => {
  const { owner } = await setupTrip(0);
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput(), name: 'Lisbon escape' })
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ name: 'Lisbon, Portugal' }]
  });
});

test('writes destinations and activities onto a shared trip', {
  timeout: 15_000
}, async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({
      destination: tripLocationInput(),
      name: 'Lisbon escape',
      totalDurationDays: 8
    })
  });

  await owner.client.mutation(internal.modules.dev.populate.write, {
    activities: [
      { destinationIndex: 0, input: tripActivityInput({ title: 'Neighborhood walk' }) },
      {
        destinationIndex: 1,
        input: tripActivityInput({ dayNumber: 5, title: 'Riverfront dinner' })
      }
    ],
    additionalDestinations: [
      tripLocationInput({
        endDay: 8,
        latitude: 41.149_61,
        longitude: -8.610_99,
        name: 'Porto, Portugal',
        placeId: 'R:3372207',
        startDay: 5
      }),
      tripLocationInput()
    ],
    primary: {
      dayNotes: 'Arrive and explore the first stop',
      endDay: 4,
      startDay: 1
    },
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [{ title: 'Neighborhood walk' }],
        dayNotes: 'Arrive and explore the first stop',
        endDay: 4,
        name: 'Lisbon, Portugal',
        startDay: 1
      },
      { activities: [{ title: 'Riverfront dinner' }], name: 'Porto, Portugal' }
    ]
  });
});

test('rejects archived, proposal, missing, and non-planner seed writes', {
  timeout: 15_000
}, async () => {
  const { addUser, owner } = await setupGroup();
  const viewer = await addUser('Viewer');
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({
      destination: tripLocationInput(),
      name: 'Guarded trip',
      totalDurationDays: 5
    })
  });
  const emptyInput = { activities: [], additionalDestinations: [], tripId };

  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(
    owner.client.mutation(internal.modules.dev.populate.write, emptyInput)
  ).rejects.toThrow('Archived trips are read-only');
  await owner.client.mutation(api.routes.trips.restore.run, { tripId });

  const proposal = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await expect(
    owner.client.mutation(internal.modules.dev.populate.write, {
      ...emptyInput,
      tripId: proposal.workingTripId
    })
  ).rejects.toThrow('Start from the shared trip');

  await expect(
    owner.client.mutation(internal.modules.dev.populate.write, {
      activities: [{ destinationIndex: 9, input: tripActivityInput() }],
      additionalDestinations: [],
      tripId
    })
  ).rejects.toThrow('Seed itinerary is missing destination 9');

  await expect(
    viewer.client.mutation(internal.modules.dev.populate.write, emptyInput)
  ).rejects.toThrow('You do not have permission to edit this trip');
});

test('skips destinations and activities that already match the seed itinerary', {
  timeout: 15_000
}, async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({
      destination: tripLocationInput(),
      name: 'Lisbon escape',
      totalDurationDays: 8
    })
  });
  const input = {
    activities: [{ destinationIndex: 0, input: tripActivityInput({ title: 'Neighborhood walk' }) }],
    additionalDestinations: [
      tripLocationInput({
        endDay: 8,
        latitude: 41.149_61,
        longitude: -8.610_99,
        name: 'Porto, Portugal',
        placeId: 'R:3372207',
        startDay: 5
      })
    ],
    primary: {
      dayNotes: 'Arrive and explore the first stop',
      endDay: 4,
      startDay: 1
    },
    tripId
  };

  await owner.client.mutation(internal.modules.dev.populate.write, input);
  await owner.client.mutation(internal.modules.dev.populate.write, input);

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [{ title: 'Neighborhood walk' }],
        name: 'Lisbon, Portugal'
      },
      { activities: [], name: 'Porto, Portugal' }
    ]
  });
});
