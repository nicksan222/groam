import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { pngBlob } from '#testing/media';
import { setupGroup } from '#testing/trips';

async function insertMedia(
  client: Awaited<ReturnType<typeof setupGroup>>['owner']['client'],
  organizationId: string,
  createdBy: string,
  name: string
) {
  return await client.run(async (ctx) => {
    const storageId = await ctx.storage.store(pngBlob());
    const mediaId = await ctx.db.insert('media', {
      contentType: 'image/png',
      createdBy,
      name,
      organizationId,
      size: 12,
      storageId
    });
    return { mediaId, storageId };
  });
}

test('organization cleanup deletes leftover media without touching other groups', async () => {
  const { owner } = await setupGroup();
  const organizationId = owner.organizationId!;
  const own = await insertMedia(owner.client, organizationId, owner.userId, 'own.png');
  const foreign = await insertMedia(owner.client, 'organization-b', 'foreign-user', 'foreign.png');

  await owner.client.mutation(internal.modules.organizations.cleanup.removeOrganizationData, {
    organizationId
  });

  await expect(owner.client.query(api.routes.media.list.run, { limit: 50 })).resolves.toEqual([]);
  await expect(owner.client.run((ctx) => ctx.storage.get(own.storageId))).resolves.toBeNull();
  await expect(
    owner.client.run((ctx) => ctx.db.get('media', foreign.mediaId))
  ).resolves.toMatchObject({ name: 'foreign.png' });
  await expect(
    owner.client.run(async (ctx) => (await ctx.storage.get(foreign.storageId)) !== null)
  ).resolves.toBe(true);
});

test('organization cleanup removes media in bounded batches', async () => {
  const { owner } = await setupGroup();
  const organizationId = owner.organizationId!;
  await owner.client.run(async (ctx) => {
    for (let index = 0; index < 51; index += 1) {
      const storageId = await ctx.storage.store(pngBlob());
      await ctx.db.insert('media', {
        contentType: 'image/png',
        createdBy: owner.userId,
        name: `batch-${index}.png`,
        organizationId,
        size: 12,
        storageId
      });
    }
  });

  await owner.client.mutation(internal.modules.organizations.cleanup.removeOrganizationData, {
    organizationId
  });
  await expect(owner.client.query(api.routes.media.list.run, { limit: 50 })).resolves.toHaveLength(
    1
  );

  await owner.client.mutation(internal.modules.organizations.cleanup.removeOrganizationData, {
    organizationId
  });
  await expect(owner.client.query(api.routes.media.list.run, { limit: 50 })).resolves.toEqual([]);
});
