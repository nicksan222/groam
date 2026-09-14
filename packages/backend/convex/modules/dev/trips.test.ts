import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { setupGroup, tripActivityInput, tripInput, tripLocationInput } from '#testing/trips';

test('creates itineraries, draft ideas, and archives in one local transaction', {
  timeout: 15_000
}, async () => {
  const { owner } = await setupGroup();
  const [activeId, archivedId] = await owner.client.mutation(internal.modules.dev.trips.write, {
    plans: [
      {
        activities: [
          { destinationIndex: 0, input: tripActivityInput({ title: 'Neighborhood walk' }) }
        ],
        additionalDestinations: [],
        archived: false,
        create: tripInput({
          destination: tripLocationInput(),
          name: 'Lisbon escape',
          totalDurationDays: 5
        }),
        primary: { dayNotes: 'Arrive and explore', endDay: 2, startDay: 1 },
        proposal: {
          notes: 'A proposed addition for the group to review',
          title: 'Add a local highlight'
        }
      },
      {
        activities: [],
        additionalDestinations: [],
        archived: true,
        create: tripInput({ name: 'Archived shortlist' })
      }
    ]
  });

  await expect(
    owner.client.query(api.routes.trips.get.run, { tripId: activeId })
  ).resolves.toMatchObject({
    coverStatus: 'pending',
    destinations: [
      {
        activities: [{ title: 'Neighborhood walk' }],
        dayNotes: 'Arrive and explore'
      }
    ],
    name: 'Lisbon escape'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId: activeId })
  ).resolves.toEqual([expect.objectContaining({ title: 'Add a local highlight' })]);
  await expect(
    owner.client.query(api.routes.trips.get.run, { tripId: archivedId })
  ).resolves.toMatchObject({
    archivedAt: expect.any(Number),
    name: 'Archived shortlist'
  });
});

test('reuses existing trips instead of duplicating itineraries and ideas', {
  timeout: 15_000
}, async () => {
  const { owner } = await setupGroup();
  const plans = [
    {
      activities: [
        { destinationIndex: 0, input: tripActivityInput({ title: 'Neighborhood walk' }) }
      ],
      additionalDestinations: [],
      archived: false,
      create: tripInput({
        clientRequestId: 'seed-trip-idempotent',
        destination: tripLocationInput(),
        name: 'Lisbon escape',
        totalDurationDays: 5
      }),
      primary: { dayNotes: 'Arrive and explore', endDay: 2, startDay: 1 },
      proposal: {
        notes: 'A proposed addition for the group to review',
        title: 'Add a local highlight'
      }
    }
  ];

  const [firstId] = await owner.client.mutation(internal.modules.dev.trips.write, { plans });
  const [secondId] = await owner.client.mutation(internal.modules.dev.trips.write, { plans });

  expect(secondId).toBe(firstId);
  await expect(
    owner.client.query(api.routes.trips.get.run, { tripId: firstId })
  ).resolves.toMatchObject({
    destinations: [{ activities: [{ title: 'Neighborhood walk' }] }]
  });
  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId: firstId })
  ).resolves.toHaveLength(1);
});
