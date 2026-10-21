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
