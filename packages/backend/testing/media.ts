import type { Id } from '#convex-generated/dataModel';
import { insertWithShortId } from '#convex/modules/references/index';
import type { setupGroup } from '#testing/trips';

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngBlob(): Blob {
  return new Blob([PNG_SIGNATURE, new Uint8Array([0, 0, 0, 0])], { type: 'image/png' });
}

/** Simulates a stored upload from before audio support was removed. */
export async function insertLegacyAudioMedia(
  owner: Awaited<ReturnType<typeof setupGroup>>['owner']
) {
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');
  return owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['ID3legacy'], { type: 'audio/mpeg' }));
    const mediaId = await ctx.db.insert('media', {
      contentType: 'audio/mpeg',
      createdBy: owner.userId,
      name: 'old-recording.mp3',
      organizationId,
      size: 9,
      storageId
    });
    return { mediaId, storageId };
  });
}

/** Each file has 20 pins and 20 chat origins on disjoint historical working copies. */
export async function seedDenseMediaOrigins(
  owner: Awaited<ReturnType<typeof setupGroup>>['owner'],
  workingTripId: Id<'trips'>,
  count: number
) {
  const seed = await owner.test.run(async (ctx) => {
    const trip = await ctx.db.get('trips', workingTripId);
    if (!trip?.proposal) throw new Error('Expected a working copy');
    const { _id: _tripId, _creationTime: _tripTime, ...fields } = trip;
    return fields;
  });
  const files: Id<'media'>[] = [];
  for (let index = 0; index < count; index += 1) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- One bounded file/origin batch per transaction; order defines cursor expectations.
    const mediaId = await owner.test.run(async (ctx) => {
      const storageId = await ctx.storage.store(pngBlob());
      const mediaId = await ctx.db.insert('media', {
        contentType: 'image/png',
        createdBy: owner.userId,
        name: `Dense protected ${index}`,
        organizationId: seed.organizationId,
        size: 12,
        storageId
      });
      await Promise.all(
        Array.from({ length: 40 }, async (_, origin) => {
          const tripId = await insertWithShortId(ctx, 'trips', seed);
          if (origin < 20) {
            await ctx.db.insert('attachments', { mediaId, tripId });
            return;
          }
          const discussionId = await insertWithShortId(ctx, 'discussions', {
            kind: 'group',
            members: [],
            clientRequestId: crypto.randomUUID(),
            createdBy: { name: 'Owner', ...seed.creator },
            organizationId: seed.organizationId,
            title: 'Dense origin',
            tripId,
            updatedAt: 1
          });
          const messageId = await ctx.db.insert('discussionMessages', {
            author: { name: 'Owner', ...seed.creator },
            clientRequestId: crypto.randomUUID(),
            content: { format: 'plain_text', text: 'Protected media' },
            discussionId,
            organizationId: seed.organizationId,
            mediaIds: [mediaId]
          });
          await ctx.db.insert('discussionMessageMedia', { mediaId, messageId });
        })
      );
      return mediaId;
    });
    files.unshift(mediaId);
  }
  return files;
}

/** Model a current seat revocation without changing the media's historical origins. */
export async function setMediaOriginSeatPaid(
  owner: Awaited<ReturnType<typeof setupGroup>>['owner'],
  args: { tripId: Id<'trips'>; userId: string; paid: boolean }
) {
  await owner.test.run(async (ctx) => {
    const payment = await ctx.db
      .query('tripPayments')
      .withIndex('by_tripId_and_userId', (q) =>
        q.eq('tripId', args.tripId).eq('userId', args.userId)
      )
      .unique();
    if (!payment) throw new Error('Expected an origin seat');
    await ctx.db.patch('tripPayments', payment._id, { paid: args.paid });
  });
}

/** Reproduce a pending file removed by concurrent organization cleanup. */
export async function deletePendingMedia(
  owner: Awaited<ReturnType<typeof setupGroup>>['owner'],
  mediaId: Id<'media'>
) {
  await owner.test.run((ctx) => ctx.db.delete('media', mediaId));
}
