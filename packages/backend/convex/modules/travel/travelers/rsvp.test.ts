import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { statusesForTrip } from '#convex/modules/travel/travelers/statuses';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

type Trip = Awaited<ReturnType<typeof setupTrip>>;

const statuses = (trip: Trip) =>
  trip.owner.test.run((ctx) =>
    statusesForTrip(ctx, trip.tripId, trip.owner.organizationId as string)
  );

async function insertInvitation(trip: Trip, organizationId = trip.owner.organizationId as string) {
  const invitationId = `invite-${crypto.randomUUID()}`;
  await trip.owner.test.run((ctx) =>
    ctx.db.insert('tripTravelers', {
      email: 'guest@example.com',
      invitationId,
      name: 'Guest',
      organizationId,
      status: 'invited',
      tripId: trip.tripId,
      updatedAt: Date.now()
    })
  );
  return invitationId;
}

test('session-free statuses read members without a row as going', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0];
  if (!member) throw new Error('Expected a member');
  await member.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'maybe',
    tripId: trip.tripId
  });
  const late = await trip.addUser('Late joiner');
  expect(await statuses(trip)).toEqual(
    expect.arrayContaining([
      { name: expect.any(String), status: 'going', userId: trip.owner.userId },
      { name: expect.any(String), status: 'maybe', userId: member.userId },
      { name: 'Late joiner', status: 'going', userId: late.userId }
    ])
  );
});

test(
  'a member who joined after the trip stores a first RSVP row',
  { timeout: 15_000 },
  async () => {
    const trip = await setupTrip(0);
    const late = await trip.addUser('Late joiner');
    await late.client.mutation(api.routes.trips.travelers.set.run, {
      status: 'not_going',
      tripId: trip.tripId
    });
    await expect(
      trip.owner.client.query(api.routes.trips.travelers.list.run, { tripId: trip.tripId })
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Late joiner', status: 'not_going', userId: late.userId })
      ])
    );
    expect(await statuses(trip)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'not_going', userId: late.userId })
      ])
    );
  }
);

test('RSVP writes refuse invited, others’ rows, and strangers', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0];
  if (!member) throw new Error('Expected a member');
  await expect(
    member.client.mutation(api.routes.trips.travelers.set.run, {
      status: 'invited',
      tripId: trip.tripId
    })
  ).rejects.toThrow('RSVP with going, maybe, or not going');
  await expect(
    member.client.mutation(api.routes.trips.travelers.set.run, {
      status: 'maybe',
      tripId: trip.tripId,
      userId: trip.owner.userId
    })
  ).rejects.toThrow('You can only update your own RSVP');
  await expect(
    trip.owner.client.mutation(api.routes.trips.travelers.set.run, {
      status: 'maybe',
      tripId: trip.tripId,
      userId: 'user-not-in-group'
    })
  ).rejects.toThrow('Traveler not found in this group');
});

test('a trip admin can RSVP for another member', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0];
  if (!member) throw new Error('Expected a member');
  await trip.owner.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'maybe',
    tripId: trip.tripId,
    userId: member.userId
  });
  expect(await statuses(trip)).toEqual(
    expect.arrayContaining([expect.objectContaining({ status: 'maybe', userId: member.userId })])
  );
});

test('claiming a trip invitation marks the claimer as going', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0];
  if (!member) throw new Error('Expected a member');
  const invitationId = await insertInvitation(trip);
  await expect(
    member.client.mutation(api.routes.trips.travelers.claim.run, { invitationId })
  ).resolves.toBe(trip.tripId);
  const row = await trip.owner.test.run((ctx) =>
    ctx.db
      .query('tripTravelers')
      .withIndex('by_invitationId', (query) => query.eq('invitationId', invitationId))
      .unique()
  );
  expect(row).toMatchObject({ status: 'going', userId: member.userId });
});

test('unknown or foreign invitations claim nothing', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(0);
  await expect(
    trip.owner.client.mutation(api.routes.trips.travelers.claim.run, {
      invitationId: 'invite-missing'
    })
  ).resolves.toBeNull();
  const invitationId = await insertInvitation(trip);
  const outsider = await createOutsiderClient(trip.owner.test);
  await expect(
    outsider.client.mutation(api.routes.trips.travelers.claim.run, { invitationId })
  ).resolves.toBeNull();
  const row = await trip.owner.test.run((ctx) =>
    ctx.db
      .query('tripTravelers')
      .withIndex('by_invitationId', (query) => query.eq('invitationId', invitationId))
      .unique()
  );
  expect(row).toMatchObject({ status: 'invited' });
  expect(row?.userId).toBeUndefined();
  expect(row?.tripId).toBe(trip.tripId as Id<'trips'>);
});
