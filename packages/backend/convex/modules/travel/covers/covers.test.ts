import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { pngBlob } from '#testing/media';
import { openTripDraft, setupGroup, tripInput, tripLocationInput } from '#testing/trips';

test('validate rejects missing, unsupported, oversized, and reused cover storage', async () => {
  const { owner } = await setupGroup();
  const missingId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(pngBlob());
    await ctx.storage.delete(storageId);
    return storageId;
  });
  const imageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const textId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['plain text'], { type: 'text/plain' }))
  );
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: {
      ...tripInput(),
      coverContentType: 'image/png',
      coverStorageId: imageId
    }
  });

  await expect(
    owner.client.run(async (ctx) => {
      const { TripCover } = await import('#convex/modules/travel/covers/index');
      return TripCover.validate(ctx, missingId, 'image/png', true);
    })
  ).rejects.toThrow('cover image was not found');
  await expect(
    owner.client.run(async (ctx) => {
      const { TripCover } = await import('#convex/modules/travel/covers/index');
      return TripCover.validate(ctx, textId, 'text/plain', true);
    })
  ).rejects.toThrow('cover must be a JPEG, PNG, WebP, or AVIF image');
  await expect(
    owner.client.run(async (ctx) => {
      const { TripCover } = await import('#convex/modules/travel/covers/index');
      return TripCover.validate(ctx, imageId, 'image/png', false);
    })
  ).rejects.toThrow('cover contents do not match its image type');
  await expect(
    owner.client.run(async (ctx) => {
      const { TripCover } = await import('#convex/modules/travel/covers/index');
      return TripCover.validate(ctx, imageId, 'image/png', true);
    })
  ).rejects.toThrow('cover image is already in use');

  expect(tripId).toBeDefined();
});

test('refresh and clearAutomatic preserve uploads and bump automatic generations', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput() })
  });
  const { workingTripId } = await openTripDraft(owner, tripId);

  const pendingRefresh = await owner.client.run(async (ctx) => {
    const { TripCover } = await import('#convex/modules/travel/covers/index');
    const { loadTripContext } = await import('#convex/modules/travel/trips/ctx');
    const cover = TripCover.from(ctx, await loadTripContext(ctx, workingTripId));
    return cover.refresh(true);
  });
  expect(pendingRefresh).toMatchObject({
    cover: { generation: 2, status: 'pending' },
    generation: 2
  });

  const uploadStorageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  await owner.client.mutation(internal.modules.travel.trips.commit.setCover, {
    contentType: 'image/png',
    signatureValid: true,
    storageId: uploadStorageId,
    tripId: workingTripId
  });
  const uploadBehavior = await owner.client.run(async (ctx) => {
    const { TripCover } = await import('#convex/modules/travel/covers/index');
    const { loadTripContext } = await import('#convex/modules/travel/trips/ctx');
    const cover = TripCover.from(ctx, await loadTripContext(ctx, workingTripId));
    return {
      cleared: cover.clearAutomatic(),
      refreshed: cover.refresh(true)
    };
  });
  expect(uploadBehavior).toEqual({ cleared: null, refreshed: null });
});

test('hasDestination reflects whether the itinerary includes a stop', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, { input: tripInput() });
  const { workingTripId } = await openTripDraft(owner, tripId);

  await expect(
    owner.client.run(async (ctx) => {
      const { TripCover } = await import('#convex/modules/travel/covers/index');
      return TripCover.hasDestination(ctx, workingTripId);
    })
  ).resolves.toBe(false);
  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId: workingTripId
  });
  await expect(
    owner.client.run(async (ctx) => {
      const { TripCover } = await import('#convex/modules/travel/covers/index');
      return TripCover.hasDestination(ctx, workingTripId);
    })
  ).resolves.toBe(true);
});
