import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { openTripDraft, setupTrip } from '#testing/trips';

test('lets an author keep more than one open idea on the same trip', async () => {
  const { owner, tripId } = await setupTrip(0);
  const first = await owner.client.mutation(api.routes.trips.versions.create.run, {
    ideaName: 'coastal-route',
    tripId
  });
  const second = await owner.client.mutation(api.routes.trips.versions.create.run, {
    ideaName: 'city-hop',
    tripId
  });
  expect(second.proposalId).not.toBe(first.proposalId);
  expect(second.workingTripId).not.toBe(first.workingTripId);
});

test('puts every group member on the trip as going', { timeout: 15_000 }, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');

  await expect(
    owner.client.query(api.routes.trips.travelers.list.run, { tripId })
  ).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ status: 'going', userId: owner.userId }),
      expect.objectContaining({ status: 'going', userId: member.userId })
    ])
  );
});

test('lists members who join the group after the trip exists', { timeout: 15_000 }, async () => {
  const { addUser, owner, tripId } = await setupTrip(0);
  const late = await addUser('Late joiner');

  await expect(
    owner.client.query(api.routes.trips.travelers.list.run, { tripId })
  ).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ status: 'going', userId: owner.userId }),
      expect.objectContaining({ status: 'going', userId: late.userId })
    ])
  );
});

test('stores RSVPs without dropping other group members', { timeout: 15_000 }, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');

  await member.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'maybe',
    tripId
  });
  const roster = await owner.client.query(api.routes.trips.travelers.list.run, { tripId });
  expect(roster).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ status: 'going', userId: owner.userId }),
      expect.objectContaining({ status: 'maybe', userId: member.userId })
    ])
  );
});

test('stores RSVPs on the shared trip from an idea copy', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  const { workingTripId } = await openTripDraft(owner, tripId);

  await owner.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'not_going',
    tripId: workingTripId
  });

  await expect(
    owner.client.query(api.routes.trips.travelers.list.run, { tripId })
  ).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ status: 'not_going', userId: owner.userId })])
  );
});

test('rejects RSVP writes on archived trips', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(
    owner.client.mutation(api.routes.trips.travelers.set.run, { status: 'not_going', tripId })
  ).rejects.toThrow('Archived trips are read-only');
});
