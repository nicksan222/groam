import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { pngBlob } from '#testing/media';
import { setupGroup, tripInput, tripLocationInput } from '#testing/trips';

afterEach(() => vi.useRealTimers());

async function cover() {
  const { TripCover } = await import('#convex/modules/travel/covers/index');
  return TripCover;
}

test('deleteIfUnreferenced removes only files nothing else points at', async () => {
  const { owner } = await setupGroup();
  const uploadId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: { ...tripInput(), coverContentType: 'image/png', coverStorageId: uploadId }
  });
  const orphanId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const exists = (id: typeof uploadId) =>
    owner.test.run(async (ctx) => (await ctx.db.system.get('_storage', id)) !== null);

  await owner.client.run(async (ctx) => {
    const TripCover = await cover();
    await TripCover.deleteIfUnreferenced(ctx, tripId, undefined);
    await TripCover.deleteIfUnreferenced(ctx, tripId, uploadId);
  });
  expect(await exists(uploadId)).toBe(true);

  await owner.client.run(async (ctx) => {
    await (await cover()).deleteIfUnreferenced(ctx, tripId, orphanId);
  });
  expect(await exists(orphanId)).toBe(false);

  // Deleting a file that is already gone is harmless.
  await owner.client.run(async (ctx) => {
    await (await cover()).deleteStorage(ctx, orphanId);
    await (await cover()).deleteStorage(ctx, undefined);
  });
});

test('discardUnusedUpload removes only fresh files that nothing owns', async () => {
  const { owner } = await setupGroup();
  const fresh = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const owned = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  await owner.client.action(api.routes.trips.create.run, {
    input: { ...tripInput(), coverContentType: 'image/png', coverStorageId: owned }
  });
  const exists = (id: typeof fresh) =>
    owner.test.run(async (ctx) => (await ctx.db.system.get('_storage', id)) !== null);

  await owner.client.run(async (ctx) => (await cover()).discardUnusedUpload(ctx, owned));
  expect(await exists(owned)).toBe(true);

  const old = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 61 * 60 * 1000);
  await owner.client.run(async (ctx) => (await cover()).discardUnusedUpload(ctx, old));
  expect(await exists(old)).toBe(true);
  vi.useRealTimers();

  await owner.client.run(async (ctx) => (await cover()).discardUnusedUpload(ctx, fresh));
  expect(await exists(fresh)).toBe(false);
  // A file that no longer exists is ignored rather than raising.
  await owner.client.run(async (ctx) => (await cover()).discardUnusedUpload(ctx, fresh));
});

test('discardUnusedUpload requires a signed-in workspace member', async () => {
  const { owner } = await setupGroup();
  const storageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  await expect(
    owner.test.run(async (ctx) => (await cover()).discardUnusedUpload(ctx, storageId))
  ).rejects.toThrow();
  expect(
    await owner.test.run(async (ctx) => (await ctx.db.system.get('_storage', storageId)) !== null)
  ).toBe(true);
});

test('ensureForTrip queues a cover only for a coverless trip that has a destination', async () => {
  const { owner } = await setupGroup();
  const bare = await owner.client.action(api.routes.trips.create.run, { input: tripInput() });
  const withStop = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput(), name: 'With stop' })
  });
  await owner.test.run((ctx) => ctx.db.patch('trips', withStop, { cover: undefined }));
  const covered = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput(), name: 'Covered' })
  });
  const before = await owner.test.run((ctx) => ctx.db.get('trips', covered));

  await owner.client.run(async (ctx) => {
    const TripCover = await cover();
    for (const tripId of [bare, withStop, covered]) await TripCover.ensureForTrip(ctx, tripId);
  });

  const [bareAfter, stopAfter, coveredAfter] = await owner.test.run((ctx) =>
    Promise.all([bare, withStop, covered].map((id) => ctx.db.get('trips', id)))
  );
  expect(bareAfter?.cover).toBeUndefined();
  expect(stopAfter?.cover).toMatchObject({ generation: 1, status: 'pending' });
  expect(coveredAfter?.cover).toEqual(before?.cover);
});

async function snapshotSetup(snapshotValue: (storageId: string) => string, proposals = 1) {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, { input: tripInput() });
  const otherTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Other' })
  });
  const storageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const exists = () =>
    owner.test.run(async (ctx) => (await ctx.db.system.get('_storage', storageId)) !== null);
  await owner.test.run(async (ctx) => {
    for (let index = 0; index < proposals; index += 1) {
      const proposalId = await ctx.db.insert('tripProposals', {
        author: { name: 'Owner', userId: 'user' },
        baseUpdatedAt: 0,
        branchName: `idea-${index}`,
        feedbackCount: 0,
        organizationId: 'org',
        requiredApprovals: 1,
        reviewers: [],
        shortId: `idea${index}`,
        sourceTripId: tripId,
        status: 'draft',
        title: `Idea ${index}`,
        titleSource: 'default',
        unresolvedFeedbackCount: 0,
        updatedAt: index,
        workingTripId: otherTripId
      });
      await ctx.db.insert('tripProposalSnapshots', {
        organizationId: 'org',
        proposalId,
        value: snapshotValue(storageId)
      });
    }
  });
  await owner.client.run(async (ctx) =>
    (await cover()).deleteIfUnreferenced(ctx, tripId, storageId)
  );
  return exists();
}

test('a cover file saved inside an idea snapshot is kept', async () => {
  expect(await snapshotSetup((id) => `{"cover":"${id}"}`)).toBe(true);
});

test('a snapshot that does not mention the file lets it be deleted', async () => {
  expect(await snapshotSetup(() => '{"cover":"other"}')).toBe(false);
});

test('an idea with too much history keeps the file rather than guessing', async () => {
  expect(await snapshotSetup(() => 'unrelated', 200)).toBe(true);
});

test('cover upload size limit is 25 MB', async () => {
  const { owner } = await setupGroup();
  const oversize = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array(25 * 1024 * 1024 + 1)], { type: 'image/png' }))
  );
  await expect(
    owner.client.run(async (ctx) => (await cover()).validate(ctx, oversize, 'image/png', true))
  ).rejects.toThrow('cover image must be 25 MB or smaller');
});

test('find loads the trip cover and clearAutomatic bumps the generation', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput() })
  });
  const result = await owner.client.run(async (ctx) => {
    const found = await (await cover()).find(ctx, tripId);
    return found.clearAutomatic();
  });
  expect(result).toEqual({ cover: undefined, generation: 2 });
});
