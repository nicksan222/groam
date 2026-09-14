import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { createAuthenticatedTest, createTest } from '#testing/factory';
import { pngBlob } from '#testing/media';

async function createOrganizationClient() {
  const { client } = await createAuthenticatedTest({
    organization: { name: 'Organization A' }
  });
  return client;
}

test('generates upload URLs only for authenticated organization members', async () => {
  const client = await createOrganizationClient();
  const uploadUrl = await client.mutation(api.routes.media.upload.run, {});
  expect(new URL(uploadUrl).pathname).toBe('/api/storage/upload');

  const unauthenticated = createTest();
  await expect(unauthenticated.mutation(api.routes.media.upload.run, {})).rejects.toThrow(
    'Not authenticated'
  );
});

test('media upload metadata and storage are scoped to the active organization', async () => {
  const client = await createOrganizationClient();
  const storageId = await client.run((ctx) => ctx.storage.store(pngBlob()));

  const saved = await client.action(api.routes.media.save.run, {
    contentType: 'image/png',
    name: '  proof.png  ',
    storageId
  });
  expect(saved.ok).toBe(true);
  if (!saved.ok) throw new Error(saved.error);
  expect(typeof saved.mediaId).toBe('string');
  await expect(
    client.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'proof.png',
      storageId
    })
  ).resolves.toEqual(saved);

  const listed = await client.query(api.routes.media.list.run, { limit: 50 });
  expect(listed).toHaveLength(1);
  expect(listed[0]).toMatchObject({
    contentType: 'image/png',
    name: 'proof.png',
    size: 12
  });
  expect(typeof listed[0]?.url).toBe('string');

  await client.mutation(api.routes.media.remove.run, { mediaId: saved.mediaId });
  await expect(client.query(api.routes.media.list.run, { limit: 50 })).resolves.toEqual([]);
  await expect(client.run((ctx) => ctx.storage.get(storageId))).resolves.toBeNull();
});

test.each(['text/plain', 'image/svg+xml'])(
  'rejects and removes unsupported %s uploads',
  async (contentType) => {
    const client = await createOrganizationClient();
    const storageId = await client.run((ctx) =>
      ctx.storage.store(new Blob(['unsupported'], { type: contentType }))
    );

    await expect(
      client.action(api.routes.media.save.run, {
        contentType,
        name: 'unsupported-file',
        storageId
      })
    ).resolves.toEqual({
      error: 'Upload a supported image, video, audio file, or PDF',
      ok: false
    });
    await expect(client.run((ctx) => ctx.storage.get(storageId))).resolves.toBeNull();
  }
);

test('oversized uploads are rejected and removed from storage', async () => {
  const client = await createOrganizationClient();
  const storageId = await client.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array(25 * 1024 * 1024 + 1)], { type: 'image/png' }))
  );

  await expect(
    client.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'oversized.png',
      storageId
    })
  ).resolves.toEqual({ error: 'Files must be 25 MB or smaller', ok: false });
  await expect(client.run((ctx) => ctx.storage.get(storageId))).resolves.toBeNull();
});

test('media deletion cannot cross organization boundaries', async () => {
  const client = await createOrganizationClient();
  const foreignMediaId = await client.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['foreign'], { type: 'image/png' }));
    return await ctx.db.insert('media', {
      contentType: 'image/png',
      createdBy: 'foreign-user',
      name: 'foreign.png',
      organizationId: 'organization-b',
      size: 7,
      storageId
    });
  });

  await expect(
    client.mutation(api.routes.media.remove.run, { mediaId: foreignMediaId })
  ).rejects.toThrow('Media not found');
});

test.each([0, 1.5, 51])('rejects invalid media list limit %s', async (limit) => {
  const client = await createOrganizationClient();
  await expect(client.query(api.routes.media.list.run, { limit })).rejects.toThrow(
    'whole number between 1 and 50'
  );
});

test('rejects signature mismatches, invalid names, and missing uploads', async () => {
  const client = await createOrganizationClient();
  const mismatchId = await client.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }))
  );
  await expect(
    client.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'not-really.png',
      storageId: mismatchId
    })
  ).resolves.toEqual({ error: 'The file contents do not match its media type', ok: false });

  const namelessId = await client.run((ctx) => ctx.storage.store(pngBlob()));
  const nameless = await client.action(api.routes.media.save.run, {
    contentType: 'image/png',
    name: '   ',
    storageId: namelessId
  });
  expect(nameless.ok).toBe(true);
  await expect(client.query(api.routes.media.list.run, { limit: 50 })).resolves.toEqual([
    expect.objectContaining({ name: 'Untitled upload' })
  ]);

  const missingId = await client.run(async (ctx) => {
    const storageId = await ctx.storage.store(pngBlob());
    await ctx.storage.delete(storageId);
    return storageId;
  });
  await expect(
    client.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'missing.png',
      storageId: missingId
    })
  ).resolves.toEqual({ error: 'The uploaded file was not found', ok: false });
});

test('media procedures require authentication', async () => {
  const unauthenticated = createTest();
  await expect(unauthenticated.query(api.routes.media.list.run, { limit: 50 })).rejects.toThrow(
    'Not authenticated'
  );
  const storageId = await unauthenticated.run((ctx) => ctx.storage.store(pngBlob()));
  await expect(
    unauthenticated.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'anonymous.png',
      storageId
    })
  ).rejects.toThrow('Not authenticated');
});
