import { expect, test } from 'vitest';
import { roleFor } from '#convex/modules/travel/trips/access';
import { api } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import { setupGroup, setupTrip } from '#testing/trips';
import { changedTripDetails } from '#testing/versions';

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

test('promotes creators and organization managers to organizer', () => {
  const trip = tripDoc();
  expect(roleFor(trip, 'owner', undefined)).toBe('organizer');
  expect(roleFor(trip, 'member', 'member')).toBe('participant');
  expect(roleFor(trip, 'member', 'admin')).toBe('organizer');
});

test('lets every organization member propose while only the creator and group admins can apply', async () => {
  const { addUser, owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');

  await expect(member.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    permissions: { canEdit: false, canPropose: true },
    role: 'participant'
  });

  const version = await member.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await member.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await member.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await expect(
    member.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ canMerge: false });
  await expect(
    member.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).rejects.toThrow('Only the trip creator or a group admin can apply ideas');

  const organizationAdmin = await addUser('Organization Admin', 'admin');
  await expect(
    organizationAdmin.client.query(api.routes.trips.get.run, { tripId })
  ).resolves.toMatchObject({
    permissions: { canEdit: false, canPropose: true },
    role: 'organizer'
  });
  await organizationAdmin.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Lisbon proposal'
  });
});

test('keeps an idea editable during review and invalidates stale approvals after changes', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected a reviewer');
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });

  await expect(
    owner.client.query(api.routes.trips.get.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({ permissions: { canEdit: true, isReadOnly: false } });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: { ...changedTripDetails, name: 'A refined idea' },
    tripId: version.workingTripId
  });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ approvalCount: 0, canMerge: false, status: 'in_review' });
});
test('requires an idea before anyone can change a shared trip', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    permissions: { canEdit: false, canPropose: true, isReadOnly: true },
    role: 'organizer'
  });
  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: {
        currency: 'EUR',
        dateNotes: 'Early September',
        destination: { name: 'Lisbon', status: 'known' },
        name: 'Lisbon direction'
      },
      tripId
    })
  ).rejects.toThrow('Start an idea to change this trip');
  await expect(
    member.client.mutation(api.routes.trips.update.run, {
      input: {
        currency: 'EUR',
        dateNotes: 'Early September',
        destination: { name: 'Lisbon', status: 'known' },
        name: 'Member rewrite'
      },
      tripId
    })
  ).rejects.toThrow('You do not have permission to edit this trip');
});

test('rejects cross-organization trip access', async () => {
  const first = await setupTrip(0);
  const second = await setupGroup();

  await expect(
    second.owner.client.query(api.routes.trips.get.run, { tripId: first.tripId })
  ).rejects.toThrow('Trip not found');
});
