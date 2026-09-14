import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupTransferEndpoints, setupWritableTrip } from '#testing/trips';

test('cascades transfer rows and attachments when their endpoints are removed', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const { firstActivityId, firstDestinationId, secondActivityId, secondDestinationId } =
    await setupTransferEndpoints(owner, tripId, 'lifecycle-second-stop');
  const mediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['ticket'], { type: 'application/pdf' }));
    return await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: owner.userId,
      name: 'transfer-proof.pdf',
      organizationId: owner.organizationId!,
      size: 6,
      storageId
    });
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: firstDestinationId,
    input: { attachmentIds: [mediaId], mode: 'car' },
    toDestinationId: secondDestinationId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: firstActivityId,
    input: { attachmentIds: [mediaId], mode: 'walk' },
    toActivityId: secondActivityId,
    tripId
  });

  await owner.client.mutation(api.routes.trips.destinations.activities.remove.run, {
    activityId: secondActivityId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.remove.run, {
    destinationId: secondDestinationId,
    tripId
  });

  await expect(
    owner.client.run(async (ctx) => ({
      attachmentReferences: await ctx.db
        .query('attachmentReferences')
        .withIndex('by_tripId_and_target_type_and_target_id_and_position', (query) =>
          query.eq('tripId', tripId)
        )
        .take(10),
      activityTransfers: await ctx.db
        .query('tripActivityTransfers')
        .withIndex('by_tripId_and_fromActivityId', (query) => query.eq('tripId', tripId))
        .take(10),
      destinationTransfers: await ctx.db
        .query('tripDestinationTransfers')
        .withIndex('by_tripId_and_fromDestinationId', (query) => query.eq('tripId', tripId))
        .take(10)
    }))
  ).resolves.toEqual({
    activityTransfers: [],
    attachmentReferences: [],
    destinationTransfers: []
  });
  await expect(owner.client.mutation(api.routes.media.remove.run, { mediaId })).resolves.toBeNull();
});
