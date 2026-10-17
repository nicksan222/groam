import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { setupGroup, tripInput, tripLocationInput } from '#testing/trips';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function imagePage(index: number, file: string, mime = 'image/png') {
  return {
    index,
    imageinfo: [
      {
        descriptionurl: `https://commons.wikimedia.org/wiki/File:${file}`,
        extmetadata: {
          Artist: { value: '<a href="https://example.com/artist">Artist</a>' },
          LicenseShortName: { value: 'CC0' }
        },
        mime,
        thumburl: `https://upload.wikimedia.org/${file}`,
        thumbwidth: 2048
      }
    ],
    title: `File:${file}`
  };
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

type Route = (url: URL) => Response | Promise<Response>;

function mockNetwork(route: Route) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return await route(url);
  });
}

afterEach(() => vi.restoreAllMocks());

async function pendingTrip() {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput(), name: 'Lisbon escape' })
  });
  const trip = await owner.test.run((ctx) => ctx.db.get('trips', tripId));
  const generation = trip?.cover?.generation;
  if (generation === undefined) throw new Error('Expected a pending cover');
  const destinationId = (
    await owner.test.run((ctx) =>
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    )
  )?._id as Id<'tripDestinations'>;
  return { destinationId, generation, owner, tripId };
}

test(
  'falls back to Wikimedia search and stores the first downloadable image',
  { timeout: 30_000 },
  async () => {
    expectConsole('warn', 'Wikipedia lead image lookup failed');
    const { generation, owner, tripId } = await pendingTrip();
    const network = mockNetwork((url) => {
      if (url.hostname === 'en.wikipedia.org') {
        return new Response('  upstream   down  ', { status: 503 });
      }
      if (url.hostname === 'commons.wikimedia.org') {
        return json({ query: { pages: [imagePage(1, 'Good.png')] } });
      }
      return new Response(PNG, { headers: { 'content-type': 'image/png; charset=binary' } });
    });
    await owner.test.action(internal.modules.travel.covers.stock.generate, {
      attempt: 0,
      generation,
      tripId
    });
    expect(network).toHaveBeenCalledTimes(3);
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      coverStatus: 'ready',
      coverUrl: expect.any(String)
    });
  }
);

test(
  'reports each rejected image and marks the cover failed after the last retry',
  { timeout: 30_000 },
  async () => {
    expectConsole('warn', 'Unable to generate a Wikipedia trip cover');
    const { generation, owner, tripId } = await pendingTrip();
    mockNetwork((url) => {
      if (url.hostname === 'en.wikipedia.org') return json({ query: { pages: [] } });
      if (url.hostname === 'commons.wikimedia.org') {
        return json({
          query: {
            pages: [
              imagePage(1, 'Missing.png'),
              imagePage(2, 'Text.png'),
              imagePage(3, 'Empty.png'),
              imagePage(4, 'Forged.png'),
              imagePage(5, 'Throws.png')
            ]
          }
        });
      }
      if (url.pathname.endsWith('Missing.png')) return new Response(' gone ', { status: 404 });
      if (url.pathname.endsWith('Text.png')) {
        return new Response('hi', { headers: { 'content-type': 'text/plain' } });
      }
      if (url.pathname.endsWith('Empty.png')) {
        return new Response(new Uint8Array(), { headers: { 'content-type': 'image/png' } });
      }
      if (url.pathname.endsWith('Forged.png')) {
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'content-type': 'image/png' }
        });
      }
      throw new Error('socket closed');
    });
    const warn = vi.spyOn(console, 'warn');
    await owner.test.action(internal.modules.travel.covers.stock.generate, {
      attempt: 3,
      generation,
      tripId
    });
    const message = String(warn.mock.calls.at(-1)?.[1]);
    expect(message).toContain('HTTP 404 (gone)');
    expect(message).toContain('unsupported content type text/plain');
    expect(message).toContain('image response was empty');
    expect(message).toContain('did not match its content type');
    expect(message).toContain('socket closed');
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      coverStatus: 'failed'
    });
  }
);

test(
  'a stale generation skips lookup and a failed lookup schedules a retry',
  { timeout: 30_000 },
  async () => {
    const { generation, owner, tripId } = await pendingTrip();
    const network = mockNetwork(() => {
      throw new Error('offline');
    });
    await owner.test.action(internal.modules.travel.covers.stock.generate, {
      attempt: 0,
      generation: generation + 10,
      tripId
    });
    expect(network).not.toHaveBeenCalled();

    expectConsole('warn', 'Wikipedia lead image lookup failed');
    await owner.test.action(internal.modules.travel.covers.stock.generate, {
      attempt: 0,
      generation,
      tripId
    });
    await owner.test.run(async (ctx) => {
      const scheduled = await ctx.db.system.query('_scheduled_functions').collect();
      expect(
        scheduled.some((job) => job.name.includes('covers/stock') && job.args[0]?.attempt === 1)
      ).toBe(true);
    });
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      coverStatus: 'pending'
    });
  }
);

test(
  'destination covers download a stock photo or fail after retries',
  { timeout: 30_000 },
  async () => {
    expectConsole(
      'warn',
      /Wikipedia lead image lookup failed|Unable to generate a Wikipedia destination cover/
    );
    const { destinationId, owner, tripId } = await pendingTrip();
    const destination = await owner.test.run((ctx) =>
      ctx.db.get('tripDestinations', destinationId)
    );
    const generation = destination?.cover?.generation ?? 1;
    if (destination?.cover?.status !== 'pending') {
      await owner.test.run((ctx) =>
        ctx.db.patch('tripDestinations', destinationId, {
          cover: { generation, status: 'pending' }
        })
      );
    }
    mockNetwork((url) => {
      if (url.hostname === 'en.wikipedia.org') return json({ query: { pages: [] } });
      if (url.hostname === 'commons.wikimedia.org') {
        return json({ query: { pages: [imagePage(1, 'Stop.png')] } });
      }
      return new Response(PNG, { headers: { 'content-type': 'image/png' } });
    });
    await owner.test.action(internal.modules.travel.covers.destination.stock.generate, {
      attempt: 0,
      destinationId,
      generation
    });
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      destinations: [{ coverStatus: 'ready', coverUrl: expect.any(String) }]
    });

    // A new pending generation keeps the earlier stock asset when every retry fails.
    await owner.test.run(async (ctx) => {
      const cover = (await ctx.db.get('tripDestinations', destinationId))?.cover;
      if (cover?.status !== 'ready' || cover.asset.source !== 'stock') {
        throw new Error('Expected a ready stock destination cover');
      }
      await ctx.db.patch('tripDestinations', destinationId, {
        cover: { asset: cover.asset, generation: generation + 1, status: 'pending' }
      });
    });
    vi.restoreAllMocks();
    mockNetwork(() => new Response('nope', { status: 500 }));
    await owner.test.action(internal.modules.travel.covers.destination.stock.generate, {
      attempt: 0,
      destinationId,
      generation: generation + 1
    });
    await owner.test.action(internal.modules.travel.covers.destination.stock.generate, {
      attempt: 3,
      destinationId,
      generation: generation + 1
    });
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      destinations: [{ coverStatus: 'ready' }]
    });
  }
);
