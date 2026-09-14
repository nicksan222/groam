import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { pngBlob } from '#testing/media';
import { setupGroup } from '#testing/trips';

async function saveImage(
  client: Awaited<ReturnType<typeof setupGroup>>['owner']['client'],
  name = 'group-logo.png'
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

test('an owner can reference Convex media as the group logo', async () => {
  const { owner } = await setupGroup();
  const first = await saveImage(owner.client, 'first.png');
  const second = await saveImage(owner.client, 'second.png');

  const firstResult = await owner.client.mutation(api.routes.media.logo.set.run, {
    mediaId: first.mediaId
  });
  expect(firstResult.mediaId).toBe(first.mediaId);
  expect(firstResult.url).toMatch(/^https:\/\//u);
  await expect(
    owner.client.mutation(api.routes.media.logo.set.run, { mediaId: first.mediaId })
  ).resolves.toEqual(firstResult);

  const secondResult = await owner.client.mutation(api.routes.media.logo.set.run, {
    mediaId: second.mediaId
  });
  const media = await owner.client.query(api.routes.media.list.run, { limit: 10 });
  expect(media.find((item) => item.id === first.mediaId)?.purpose).toBeUndefined();
  expect(media.find((item) => item.id === second.mediaId)?.purpose).toBe('groupLogo');

  const organization = await owner.authClient.organization.getFullOrganization({
    query: { organizationId: owner.organizationId! }
  });
  expect(organization.data?.logo).toBe(secondResult.url);

  await expect(
    owner.client.mutation(api.routes.media.remove.run, { mediaId: second.mediaId })
  ).rejects.toThrow('Remove or replace the group logo');

  await owner.client.mutation(api.routes.media.logo.clear.run, {});
  await owner.client.mutation(api.routes.media.logo.clear.run, {});
  const clearedOrganization = await owner.authClient.organization.getFullOrganization({
    query: { organizationId: owner.organizationId! }
  });
  expect(clearedOrganization.data?.logo).toBeNull();
  await expect(
    owner.client.mutation(api.routes.media.remove.run, { mediaId: second.mediaId })
  ).resolves.toBeNull();
});

test('rejects non-image and missing logo files', async () => {
  const { owner } = await setupGroup();
  const pdfStorageId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['%PDF-'], { type: 'application/pdf' }))
  );
  const pdf = await owner.client.action(api.routes.media.save.run, {
    contentType: 'application/pdf',
    name: 'document.pdf',
    storageId: pdfStorageId
  });
  if (!pdf.ok) throw new Error(pdf.error);
  await expect(
    owner.client.mutation(api.routes.media.logo.set.run, { mediaId: pdf.mediaId })
  ).rejects.toThrow('Group logo must be an image');

  const missing = await saveImage(owner.client, 'missing.png');
  await owner.client.run((ctx) => ctx.storage.delete(missing.storageId));
  await expect(
    owner.client.mutation(api.routes.media.logo.set.run, { mediaId: missing.mediaId })
  ).rejects.toThrow('Group logo image was not found');
});

test('members cannot change the group logo', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Member');
  const image = await saveImage(owner.client);

  await expect(
    member.client.mutation(api.routes.media.logo.set.run, { mediaId: image.mediaId })
  ).rejects.toThrow('Only organization owners and admins can manage group settings');
  await expect(member.client.mutation(api.routes.media.logo.clear.run, {})).rejects.toThrow(
    'Only organization owners and admins can manage group settings'
  );

  const referenced = await owner.client.run((ctx) => ctx.db.get('media', image.mediaId));
  expect(referenced?.purpose).toBeUndefined();
});

test('an admin can set and clear the group logo', async () => {
  const { addUser, owner } = await setupGroup();
  const admin = await addUser('Admin', 'admin');
  const image = await saveImage(owner.client);

  const result = await admin.client.mutation(api.routes.media.logo.set.run, {
    mediaId: image.mediaId
  });
  expect(result.mediaId).toBe(image.mediaId);
  await expect(admin.client.mutation(api.routes.media.logo.clear.run, {})).resolves.toBeNull();
});

test('a group cannot reference another group’s media as its logo', async () => {
  const { owner } = await setupGroup();
  const image = await saveImage(owner.client);
  const outsider = await createOutsiderClient(owner.test);

  await expect(
    outsider.client.mutation(api.routes.media.logo.set.run, { mediaId: image.mediaId })
  ).rejects.toThrow('Media not found');
});
