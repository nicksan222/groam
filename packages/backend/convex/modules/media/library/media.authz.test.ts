import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { createAuthenticatedTest, createTestUser } from '#testing/factory';
import { pngBlob } from '#testing/media';
import { setupGroup } from '#testing/trips';

async function createSecondOrganization(
  shared: Awaited<ReturnType<typeof createAuthenticatedTest>>,
  name: string
) {
  const outsider = await createTestUser(shared.test, {
    email: `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID()}@example.com`,
    name
  });
  const created = await outsider.authClient.organization.create({
    name,
    slug: `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID()}`
  });
  if (created.error || created.data === null) {
    throw new Error(created.error?.message ?? 'Unable to create a second organization');
  }
  const activated = await outsider.authClient.organization.setActive({
    organizationId: created.data.id
  });
  if (activated.error) {
    throw new Error(activated.error.message ?? 'Unable to activate the second organization');
  }
  return { ...outsider, organizationId: created.data.id };
}

async function savePng(
  client: Awaited<ReturnType<typeof createAuthenticatedTest>>['client'],
  name = 'proof.png'
) {
  const storageId = await client.run((ctx) => ctx.storage.store(pngBlob()));
  const saved = await client.action(api.routes.media.save.run, {
    contentType: 'image/png',
    name,
    storageId
  });
  if (!saved.ok) throw new Error(saved.error);
  return { mediaId: saved.mediaId, storageId };
}

test('media lists stay inside the caller’s active organization', async () => {
  const owner = await createAuthenticatedTest({ organization: { name: 'Organization A' } });
  const outsider = await createSecondOrganization(owner, 'Organization B');
  await savePng(owner.client, 'private.png');

  await expect(owner.client.query(api.routes.media.list.run, { limit: 50 })).resolves.toEqual([
    expect.objectContaining({ name: 'private.png' })
  ]);
  await expect(outsider.client.query(api.routes.media.list.run, { limit: 50 })).resolves.toEqual(
    []
  );
});

test('another organization cannot claim an already saved upload', async () => {
  const owner = await createAuthenticatedTest({ organization: { name: 'Organization A' } });
  const outsider = await createSecondOrganization(owner, 'Organization B');
  const { storageId } = await savePng(owner.client);

  await expect(
    outsider.client.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'stolen.png',
      storageId
    })
  ).resolves.toEqual({ error: 'The uploaded file is not available', ok: false });
});

test('a teammate cannot claim another member’s saved upload', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Member');
  const { mediaId, storageId } = await savePng(owner.client);

  await expect(
    member.client.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'claimed.png',
      storageId
    })
  ).resolves.toEqual({ error: 'The uploaded file is not available', ok: false });
  await expect(owner.client.query(api.routes.media.list.run, { limit: 10 })).resolves.toEqual([
    expect.objectContaining({ id: mediaId })
  ]);
});

test('revoked members cannot read organization media', async () => {
  const revoked = await createAuthenticatedTest({
    organization: { membership: 'revoked', name: 'Locked Out' }
  });
  await expect(revoked.client.query(api.routes.media.list.run, { limit: 1 })).rejects.toThrow(
    /Organization access denied|No active organization/u
  );
});
