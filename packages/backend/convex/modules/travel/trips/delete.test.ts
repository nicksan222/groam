import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { pngBlob } from '#testing/media';
import {
  openTripDraft,
  setupGroup,
  tripActivityInput,
  tripInput,
  tripLocationInput
} from '#testing/trips';

test('deleting an organization removes its trips, discussions, media, and stored files', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Trip Editor');
  const storageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const sharedTripId = await owner.client.action(api.routes.trips.create.run, {
    input: {
      ...tripInput({
        dateNotes: 'Next spring',
        destination: tripLocationInput()
      }),
      coverContentType: 'image/png',
      coverStorageId: storageId
    }
  });
  const { workingTripId: tripId } = await openTripDraft(owner, sharedTripId);
  const detail = await owner.client.query(api.routes.trips.get.run, { tripId });
  const destination = detail.destinations[0];
  if (!destination) throw new Error('Expected a destination');
  const firstActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: destination.id,
      input: tripActivityInput(),
      tripId
    }
  );
  const secondActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: destination.id,
      input: tripActivityInput({ title: 'Dinner' }),
      tripId
    }
  );
  const secondDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      latitude: 41,
      longitude: -8,
      name: 'Porto, Portugal',
      placeId: 'porto-cleanup'
    }),
    tripId
  });
  const { transferMediaId, transferStorageId } = await owner.client.run(async (ctx) => {
    const transferStorageId = await ctx.storage.store(
      new Blob(['ticket'], { type: 'application/pdf' })
    );
    const transferMediaId = await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: owner.userId,
      name: 'ticket.pdf',
      organizationId: owner.organizationId!,
      size: 6,
      storageId: transferStorageId
    });
    return { transferMediaId, transferStorageId };
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: destination.id,
    input: { attachmentIds: [transferMediaId], mode: 'train' },
    toDestinationId: secondDestinationId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: { attachmentIds: [transferMediaId], mode: 'flight' },
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: firstActivityId,
    input: { attachmentIds: [transferMediaId], mode: 'walk' },
    toActivityId: secondActivityId,
    tripId
  });
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'cleanup-discussion',
    memberUserIds: [member.userId],
    title: 'Cleanup discussion'
  });
  await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: 'cleanup-message',
    discussionId,
    text: 'This should be removed.'
  });

  const deletion = await owner.authClient.organization.delete({
    organizationId: owner.organizationId!
  });
  if (deletion.error) throw new Error(deletion.error.message ?? 'Unable to delete organization');
  for (let index = 0; index < 16; index += 1) {
    await owner.client.mutation(internal.modules.organizations.cleanup.removeOrganizationData, {
      organizationId: owner.organizationId!
    });
  }

  await expect(
    owner.client.run(async (ctx) => ({
      attachmentReferences: await ctx.db
        .query('attachmentReferences')
        .withIndex('by_tripId_and_target_type_and_target_id_and_position', (query) =>
          query.eq('tripId', tripId)
        )
        .take(1),
      attachments: await ctx.db
        .query('attachments')
        .withIndex('by_tripId_and_mediaId', (query) => query.eq('tripId', tripId))
        .take(1),
      activityTransfers: await ctx.db
        .query('tripActivityTransfers')
        .withIndex('by_tripId_and_fromActivityId', (query) => query.eq('tripId', tripId))
        .take(1),
      boundaryTransfers: await ctx.db
        .query('tripBoundaryTransfers')
        .withIndex('by_tripId_and_boundary', (query) => query.eq('tripId', tripId))
        .take(1),
      destinationTransfers: await ctx.db
        .query('tripDestinationTransfers')
        .withIndex('by_tripId_and_fromDestinationId', (query) => query.eq('tripId', tripId))
        .take(1),
      activity: await ctx.db
        .query('tripAuditEvents')
        .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
        .take(1),
      discussionMembers: await ctx.db
        .query('discussionMembers')
        .withIndex('by_organizationId', (query) =>
          query.eq('organizationId', owner.organizationId!)
        )
        .take(1),
      discussionMessages: await ctx.db
        .query('discussionMessages')
        .withIndex('by_organizationId', (query) =>
          query.eq('organizationId', owner.organizationId!)
        )
        .take(1),
      discussions: await ctx.db
        .query('discussions')
        .withIndex('by_organizationId', (query) =>
          query.eq('organizationId', owner.organizationId!)
        )
        .take(1),
      destinations: await ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .take(1),
      itinerary: await ctx.db
        .query('tripDestinationActivities')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .take(1),
      storage: await ctx.storage.get(storageId),
      transferMedia: await ctx.db.get('media', transferMediaId),
      transferStorage: await ctx.storage.get(transferStorageId),
      trip: await ctx.db.get('trips', tripId)
    }))
  ).resolves.toEqual({
    activity: [],
    activityTransfers: [],
    attachmentReferences: [],
    boundaryTransfers: [],
    attachments: [],
    destinationTransfers: [],
    discussionMembers: [],
    discussionMessages: [],
    discussions: [],
    destinations: [],
    itinerary: [],
    storage: null,
    transferMedia: null,
    transferStorage: null,
    trip: null
  });
});
