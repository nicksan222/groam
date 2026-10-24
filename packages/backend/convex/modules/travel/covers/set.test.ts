import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { pngBlob } from '#testing/media';
import { openTripDraft, setupGroup, tripInput, tripLocationInput } from '#testing/trips';

const attribution = {
  creator: 'Public Domain Photographer',
  creatorUrl: 'https://example.com/photographer',
  license: 'CC0 1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sourceName: 'Openverse Source',
  sourceUrl: 'https://example.com/photo',
  title: 'Lisbon skyline'
};

async function commitStockCover(owner: Awaited<ReturnType<typeof setupGroup>>['owner']) {
  const sharedTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput() })
  });
  const { workingTripId: tripId } = await openTripDraft(owner, sharedTripId);
  const storageId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['stock'], { type: 'image/jpeg' }))
  );
  const committed = await owner.client.mutation(internal.modules.travel.covers.stock.commit, {
    attribution,
    generation: 1,
    storageId,
    tripId
  });
  return { committed, storageId, tripId };
}

test(
  'queues an automatic commercial-use location cover when a trip has no upload',
  {
    timeout: 15_000
  },
  async () => {
    const { owner } = await setupGroup();
    const tripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({
        destination: {
          coordinates: { latitude: 38.707_751, longitude: -9.136_592 },
          countryCode: 'PT',
          name: 'Lisbon, Portugal',
          placeId: 'R:5400890',
          status: 'known'
        }
      })
    });

    await expect(owner.client.run((ctx) => ctx.db.get('trips', tripId))).resolves.toMatchObject({
      cover: { generation: 1, status: 'pending' }
    });
    await expect(
      owner.client.query(internal.modules.travel.covers.stock.request, {
        generation: 1,
        tripId
      })
    ).resolves.toEqual({
      excludedSourceUrl: null,
      query: 'Lisbon, Portugal'
    });
  }
);

test('refreshes automatic-cover search when the selected place changes', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput() })
  });
  const { workingTripId } = await openTripDraft(owner, tripId);
  const previousStorageId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['Lisbon stock'], { type: 'image/jpeg' }))
  );
  await owner.client.mutation(internal.modules.travel.covers.stock.commit, {
    attribution,
    generation: 1,
    storageId: previousStorageId,
    tripId: workingTripId
  });

  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      currency: 'EUR',
      destination: tripLocationInput({
        latitude: 41.149_61,
        longitude: -8.610_99,
        name: 'Porto, Portugal',
        placeId: 'R:3372207'
      }),
      name: 'Portugal trip'
    },
    tripId: workingTripId
  });

  await expect(
    owner.client.query(internal.modules.travel.covers.stock.request, {
      generation: 1,
      tripId: workingTripId
    })
  ).resolves.toBeNull();
  await expect(
    owner.client.query(internal.modules.travel.covers.stock.request, {
      generation: 2,
      tripId: workingTripId
    })
  ).resolves.toEqual({
    excludedSourceUrl: null,
    query: 'Porto, Portugal'
  });
  await expect(
    owner.client.run((ctx) => ctx.db.system.get('_storage', previousStorageId))
  ).resolves.not.toBeNull();
  const refreshed = await owner.client.query(api.routes.trips.get.run, { tripId: workingTripId });
  expect(['pending', 'ready']).toContain(refreshed.coverStatus);
  if (refreshed.coverStatus === 'ready') {
    expect(refreshed.coverAttribution?.title).toMatch(/Porto/iu);
    expect(refreshed.coverUrl).toEqual(expect.any(String));
  } else {
    expect(refreshed).toMatchObject({ coverAttribution: null, coverUrl: null });
  }
});

test('ensure backfills a missing trip cover when the trip already has destinations', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput() })
  });
  await owner.client.run((ctx) => ctx.db.patch('trips', tripId, { cover: undefined }));

  await owner.client.mutation(api.routes.trips.covers.ensure.run, { tripId });

  await expect(owner.client.run((ctx) => ctx.db.get('trips', tripId))).resolves.toMatchObject({
    cover: { generation: 1, status: 'pending' }
  });
  await expect(
    owner.client.query(internal.modules.travel.covers.stock.request, {
      generation: 1,
      tripId
    })
  ).resolves.toEqual({
    excludedSourceUrl: null,
    query: 'Lisbon, Portugal'
  });
});

test('commits stock provenance and exposes it with the cover', async () => {
  const { owner } = await setupGroup();
  const { committed, tripId } = await commitStockCover(owner);

  expect(committed).toBe(true);
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    coverAttribution: attribution,
    coverStatus: 'ready',
    coverUrl: expect.any(String)
  });
});

test('keeps media library files and trip covers on distinct storage objects', async () => {
  const { owner } = await setupGroup();
  const mediaStorageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const saved = await owner.client.action(api.routes.media.save.run, {
    contentType: 'image/png',
    name: 'library.png',
    storageId: mediaStorageId
  });
  expect(saved.ok).toBe(true);
  await expect(
    owner.client.action(api.routes.trips.create.run, {
      input: {
        ...tripInput(),
        coverContentType: 'image/png',
        coverStorageId: mediaStorageId
      }
    })
  ).rejects.toThrow('cover image is already in use');

  const coverStorageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  await owner.client.action(api.routes.trips.create.run, {
    input: {
      ...tripInput(),
      coverContentType: 'image/png',
      coverStorageId
    }
  });
  await expect(
    owner.client.action(api.routes.media.save.run, {
      contentType: 'image/png',
      name: 'cover.png',
      storageId: coverStorageId
    })
  ).resolves.toEqual({
    error: 'The uploaded file is already used as a trip cover',
    ok: false
  });
});
