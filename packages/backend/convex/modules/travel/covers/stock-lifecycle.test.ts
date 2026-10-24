import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { pngBlob } from '#testing/media';
import { setupGroup, tripInput, tripLocationInput } from '#testing/trips';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const attribution = {
  creator: 'Photographer',
  license: 'CC0 1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sourceName: 'Wikimedia Commons',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Old.jpg',
  title: 'Old'
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

async function workingResponse(input: Parameters<typeof fetch>[0]) {
  {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === 'en.wikipedia.org') return json({ query: { pages: [] } });
    if (url.hostname === 'commons.wikimedia.org') {
      return json({
        query: {
          pages: [
            {
              imageinfo: [
                {
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:New.png',
                  extmetadata: { LicenseShortName: { value: 'CC0' } },
                  mime: 'image/png',
                  thumburl: 'https://upload.wikimedia.org/New.png',
                  thumbwidth: 2400
                }
              ],
              title: 'File:New.png'
            }
          ]
        }
      });
    }
    return new Response(PNG, { headers: { 'content-type': 'image/png' } });
  }
}

function workingNetwork() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(workingResponse);
}

afterEach(() => vi.restoreAllMocks());

async function pendingTrip(withUpload = false) {
  const { owner } = await setupGroup();
  const uploadId = withUpload
    ? await owner.client.run((ctx) => ctx.storage.store(pngBlob()))
    : undefined;
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({
      destination: tripLocationInput(),
      ...(uploadId ? { coverContentType: 'image/png', coverStorageId: uploadId } : {})
    })
  });
  const trip = await owner.test.run((ctx) => ctx.db.get('trips', tripId));
  return { generation: trip?.cover?.generation ?? 0, owner, tripId, uploadId };
}

type Owner = Awaited<ReturnType<typeof pendingTrip>>['owner'];

const storageExists = (owner: Owner, id: Id<'_storage'>) =>
  owner.test.run(async (ctx) => (await ctx.db.system.get('_storage', id)) !== null);

test('the stock cover replaces the previous one and removes the old file', async () => {
  const { generation, owner, tripId } = await pendingTrip();
  const oldId = await owner.test.run((ctx) => ctx.storage.store(pngBlob()));
  await owner.test.run((ctx) =>
    ctx.db.patch('trips', tripId, {
      cover: {
        asset: { attribution, source: 'stock', storageId: oldId },
        generation,
        status: 'pending'
      }
    })
  );
  workingNetwork();

  await owner.test.action(internal.modules.travel.covers.stock.generate, {
    attempt: 0,
    generation,
    tripId
  });

  const cover = (await owner.test.run((ctx) => ctx.db.get('trips', tripId)))?.cover;
  if (cover?.status !== 'ready') throw new Error('Expected a ready cover');
  expect(cover.asset.storageId).not.toBe(oldId);
  expect(cover.asset).toMatchObject({
    attribution: { sourceUrl: expect.stringContaining('New.png') },
    source: 'stock'
  });
  expect(await storageExists(owner, oldId)).toBe(false);
  expect(await storageExists(owner, cover.asset.storageId)).toBe(true);
});

test('a result that lost the race is deleted instead of committed', async () => {
  const { generation, owner, tripId } = await pendingTrip();
  // The cover moves to a newer generation while the photo is downloading.
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const response = await workingResponse(input);
    if (String(input).includes('upload.wikimedia.org')) {
      await owner.test.run((ctx) =>
        ctx.db.patch('trips', tripId, { cover: { generation: generation + 1, status: 'pending' } })
      );
    }
    return response;
  });

  await owner.test.action(internal.modules.travel.covers.stock.generate, {
    attempt: 0,
    generation,
    tripId
  });

  const trip = await owner.test.run((ctx) => ctx.db.get('trips', tripId));
  expect(trip?.cover).toEqual({ generation: generation + 1, status: 'pending' });
  const files = await owner.test.run((ctx) => ctx.db.system.query('_storage').collect());
  expect(files).toEqual([]);
});

test('an uploaded cover is never replaced, requested, or marked failed', async () => {
  const { generation, owner, tripId, uploadId } = await pendingTrip(true);
  const network = workingNetwork();
  const cover = (await owner.test.run((ctx) => ctx.db.get('trips', tripId)))?.cover;

  await owner.test.action(internal.modules.travel.covers.stock.generate, {
    attempt: 0,
    generation,
    tripId
  });
  await owner.test.mutation(internal.modules.travel.covers.stock.markFailed, {
    generation,
    tripId
  });
  await expect(
    owner.test.query(internal.modules.travel.covers.stock.request, { generation, tripId })
  ).resolves.toBeNull();
  expect(network).not.toHaveBeenCalled();
  const after = (await owner.test.run((ctx) => ctx.db.get('trips', tripId)))?.cover;
  expect(after).toEqual(cover);
  expect(after).toMatchObject({ asset: { source: 'upload', storageId: uploadId } });
});

test('commit and markFailed ignore stale generations and ready covers', async () => {
  const { generation, owner, tripId } = await pendingTrip();
  const storageId = await owner.test.run((ctx) => ctx.storage.store(pngBlob()));

  await expect(
    owner.test.mutation(internal.modules.travel.covers.stock.commit, {
      attribution,
      generation: generation + 1,
      storageId,
      tripId
    })
  ).resolves.toBe(false);
  await owner.test.mutation(internal.modules.travel.covers.stock.markFailed, {
    generation: generation + 1,
    tripId
  });
  expect((await owner.test.run((ctx) => ctx.db.get('trips', tripId)))?.cover).toEqual({
    generation,
    status: 'pending'
  });

  await expect(
    owner.test.mutation(internal.modules.travel.covers.stock.commit, {
      attribution,
      generation,
      storageId,
      tripId
    })
  ).resolves.toBe(true);
  // A second commit for the same generation is a no-op because the cover is already ready.
  await expect(
    owner.test.mutation(internal.modules.travel.covers.stock.commit, {
      attribution,
      generation,
      storageId,
      tripId
    })
  ).resolves.toBe(false);
});

test('a failed refresh keeps the previous stock photo instead of showing an error', async () => {
  const { generation, owner, tripId } = await pendingTrip();
  const storageId = await owner.test.run((ctx) => ctx.storage.store(pngBlob()));
  await owner.test.run((ctx) =>
    ctx.db.patch('trips', tripId, {
      cover: { asset: { attribution, source: 'stock', storageId }, generation, status: 'pending' }
    })
  );

  await owner.test.mutation(internal.modules.travel.covers.stock.markFailed, {
    generation,
    tripId
  });

  expect((await owner.test.run((ctx) => ctx.db.get('trips', tripId)))?.cover).toEqual({
    asset: { attribution, source: 'stock', storageId },
    generation,
    status: 'ready'
  });
});

test('a trip with no destination loses its pending cover when generation gives up', async () => {
  const { generation, owner, tripId } = await pendingTrip();
  await owner.test.run(async (ctx) => {
    const stops = await ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .collect();
    for (const stop of stops) await ctx.db.delete('tripDestinations', stop._id);
  });

  await owner.test.mutation(internal.modules.travel.covers.stock.markFailed, {
    generation,
    tripId
  });
  await expect(
    owner.test.query(internal.modules.travel.covers.stock.request, { generation, tripId })
  ).resolves.toBeNull();
  expect((await owner.test.run((ctx) => ctx.db.get('trips', tripId)))?.cover).toBeUndefined();
});

test('failed attempts back off by 30 seconds, 2 minutes, then 10 minutes', async () => {
  expectConsole('warn', 'Wikipedia lead image lookup failed');
  const { generation, owner, tripId } = await pendingTrip();
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

  const before = Date.now();
  for (const attempt of [0, 1, 2]) {
    await owner.test.action(internal.modules.travel.covers.stock.generate, {
      attempt,
      generation,
      tripId
    });
  }

  const jobs = await owner.test.run(async (ctx) =>
    (await ctx.db.system.query('_scheduled_functions').collect())
      .filter((job) => job.name.includes('covers/stock') && job.args[0]?.attempt > 0)
      .sort((left, right) => left.args[0].attempt - right.args[0].attempt)
  );
  expect(jobs.map((job) => job.args[0].attempt)).toEqual([1, 2, 3]);
  const delays = jobs.map((job) => Math.round((job.scheduledTime - before) / 1000));
  expect(delays[0]).toBeGreaterThanOrEqual(29);
  expect(delays[0]).toBeLessThanOrEqual(35);
  expect(delays[1]).toBeGreaterThanOrEqual(119);
  expect(delays[1]).toBeLessThanOrEqual(125);
  expect(delays[2]).toBeGreaterThanOrEqual(599);
  expect(delays[2]).toBeLessThanOrEqual(605);
});

test('destination commit and markFailed ignore stale generations', async () => {
  const { generation, owner, tripId } = await pendingTrip();
  const destinationId = (
    await owner.test.run((ctx) =>
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    )
  )?._id as Id<'tripDestinations'>;
  await owner.test.run((ctx) =>
    ctx.db.patch('tripDestinations', destinationId, { cover: { generation, status: 'pending' } })
  );
  const storageId = await owner.test.run((ctx) => ctx.storage.store(pngBlob()));

  await expect(
    owner.test.mutation(internal.modules.travel.covers.destination.stock.commit, {
      attribution,
      destinationId,
      generation: generation + 1,
      storageId
    })
  ).resolves.toBe(false);
  await owner.test.mutation(internal.modules.travel.covers.destination.stock.markFailed, {
    destinationId,
    generation: generation + 1
  });
  await expect(
    owner.test.query(internal.modules.travel.covers.destination.stock.request, {
      destinationId,
      generation: generation + 1
    })
  ).resolves.toBeNull();

  await owner.test.mutation(internal.modules.travel.covers.destination.stock.markFailed, {
    destinationId,
    generation
  });
  expect(
    (await owner.test.run((ctx) => ctx.db.get('tripDestinations', destinationId)))?.cover
  ).toEqual({ generation, status: 'failed' });
  await expect(
    owner.test.query(internal.modules.travel.covers.destination.stock.request, {
      destinationId,
      generation
    })
  ).resolves.toBeNull();
});

test('a destination photo that lost the race is deleted, and retries are scheduled', async () => {
  const { owner, tripId } = await pendingTrip();
  const destinationId = (
    await owner.test.run((ctx) =>
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    )
  )?._id as Id<'tripDestinations'>;
  await owner.test.run((ctx) =>
    ctx.db.patch('tripDestinations', destinationId, { cover: { generation: 5, status: 'pending' } })
  );
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const response = await workingResponse(input);
    if (String(input).includes('upload.wikimedia.org')) {
      await owner.test.run((ctx) =>
        ctx.db.patch('tripDestinations', destinationId, {
          cover: { generation: 6, status: 'pending' }
        })
      );
    }
    return response;
  });

  await owner.test.action(internal.modules.travel.covers.destination.stock.generate, {
    attempt: 0,
    destinationId,
    generation: 5
  });
  expect(await owner.test.run((ctx) => ctx.db.system.query('_storage').collect())).toEqual([]);

  expectConsole('warn', 'Wikipedia lead image lookup failed');
  vi.restoreAllMocks();
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  await owner.test.action(internal.modules.travel.covers.destination.stock.generate, {
    attempt: 1,
    destinationId,
    generation: 6
  });
  const attempts = await owner.test.run(async (ctx) =>
    (await ctx.db.system.query('_scheduled_functions').collect())
      .filter((job) => job.name.includes('destination/stock'))
      .map((job) => job.args[0]?.attempt)
  );
  expect(attempts).toContain(2);
});

test('destination ensure queues only stops without a cover, staggered 250ms apart', async () => {
  const { owner, tripId } = await pendingTrip();
  const existing = await owner.test.run((ctx) =>
    ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .first()
  );
  if (!existing) throw new Error('Expected a destination');
  const insertStop = (position: number, cover?: { generation: number; status: 'failed' }) =>
    owner.test.run((ctx) =>
      ctx.db.insert('tripDestinations', {
        coordinates: { latitude: 41, longitude: -8 },
        name: `Stop ${position}`,
        placeId: `R:${position}`,
        position,
        tripId,
        ...(cover ? { cover } : {})
      })
    );
  await owner.test.run((ctx) =>
    ctx.db.patch('tripDestinations', existing._id, { cover: undefined })
  );
  const keptId = await insertStop(1, { generation: 3, status: 'failed' });
  const queuedId = await insertStop(2);

  await owner.client.mutation(api.routes.trips.destinations.covers.ensure.run, { tripId });

  const covers = await owner.test.run(async (ctx) => ({
    kept: (await ctx.db.get('tripDestinations', keptId))?.cover,
    queued: (await ctx.db.get('tripDestinations', queuedId))?.cover,
    first: (await ctx.db.get('tripDestinations', existing._id))?.cover
  }));
  expect(covers).toEqual({
    first: { generation: 1, status: 'pending' },
    kept: { generation: 3, status: 'failed' },
    queued: { generation: 1, status: 'pending' }
  });
  const jobs = await owner.test.run(async (ctx) =>
    (await ctx.db.system.query('_scheduled_functions').collect()).filter((job) =>
      job.name.includes('destination/stock')
    )
  );
  const queuedJob = jobs.find((job) => job.args[0]?.destinationId === queuedId);
  const firstJob = jobs.find((job) => job.args[0]?.destinationId === existing._id);
  expect(jobs.some((job) => job.args[0]?.destinationId === keptId)).toBe(false);
  expect((queuedJob?.scheduledTime ?? 0) - (firstJob?.scheduledTime ?? 0)).toBeGreaterThanOrEqual(
    400
  );
});

test('a replaced destination photo keeps the old stock asset while the new one is pending', async () => {
  const { owner, tripId } = await pendingTrip();
  const destination = await owner.test.run((ctx) =>
    ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .first()
  );
  if (!destination) throw new Error('Expected a destination');
  const storageId = await owner.test.run((ctx) => ctx.storage.store(pngBlob()));
  await owner.test.run((ctx) =>
    ctx.db.patch('tripDestinations', destination._id, {
      cover: { asset: { attribution, source: 'stock', storageId }, generation: 2, status: 'ready' }
    })
  );

  await owner.test.run(async (ctx) => {
    const { DestinationCover } = await import('#convex/modules/travel/covers/destination/index');
    const current = await ctx.db.get('tripDestinations', destination._id);
    if (!current) throw new Error('Expected a destination');
    await DestinationCover.queue(ctx, current);
    await DestinationCover.deleteStorage(ctx, { cover: undefined });
    expect(await ctx.db.system.get('_storage', storageId)).not.toBeNull();
    await DestinationCover.deleteStorage(ctx, current);
  });

  expect(
    (await owner.test.run((ctx) => ctx.db.get('tripDestinations', destination._id)))?.cover
  ).toEqual({
    asset: { attribution, source: 'stock', storageId },
    generation: 3,
    status: 'pending'
  });
  expect(await storageExists(owner, storageId)).toBe(false);
});
