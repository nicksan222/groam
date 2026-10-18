import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setupGroup, tripActivityInput, tripInput, tripLocationInput } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

const hostedError = 'only available in local development';

test(
  'local seed routes write trips and itineraries and refuse hosted deployments',
  { timeout: 30_000 },
  async () => {
    const { owner } = await setupGroup();
    const plans = [
      {
        activities: [],
        additionalDestinations: [],
        archived: false,
        create: tripInput({
          clientRequestId: 'seed-route',
          destination: tripLocationInput(),
          name: 'Porto'
        }),
        proposal: { notes: 'Try a port cellar', title: 'Port tasting' }
      }
    ];
    vi.stubEnv('CONVEX_SITE_URL', 'https://groam.example');
    await expect(
      owner.client.mutation(api.routes.trips.seed.workspace.run, { plans })
    ).rejects.toThrow(hostedError);

    vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
    const [tripId] = await owner.client.mutation(api.routes.trips.seed.workspace.run, { plans });
    if (!tripId) throw new Error('Expected a seeded trip');
    // Seeding again reuses the trip and does not duplicate the proposal.
    await expect(
      owner.client.mutation(api.routes.trips.seed.workspace.run, { plans })
    ).resolves.toEqual([tripId]);
    await expect(
      owner.client.query(api.routes.trips.versions.list.run, { tripId })
    ).resolves.toEqual([expect.objectContaining({ title: 'Port tasting' })]);

    const itinerary = {
      activities: [{ destinationIndex: 0, input: tripActivityInput({ title: 'Ribeira walk' }) }],
      additionalDestinations: [],
      tripId
    };
    vi.stubEnv('CONVEX_SITE_URL', 'https://groam.example');
    await expect(
      owner.client.mutation(api.routes.trips.seed.populate.run, itinerary)
    ).rejects.toThrow(hostedError);
    vi.stubEnv('CONVEX_SITE_URL', 'http://localhost:3211');
    await owner.client.mutation(api.routes.trips.seed.populate.run, itinerary);
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      destinations: [{ activities: [expect.objectContaining({ title: 'Ribeira walk' })] }]
    });
  }
);

test('local reset route clears data only on a local deployment', { timeout: 30_000 }, async () => {
  const { owner } = await setupGroup();
  await owner.client.action(api.routes.trips.create.run, { input: tripInput() });
  vi.stubEnv('CONVEX_SITE_URL', 'https://groam.example');
  await expect(owner.test.mutation(api.routes.dev.reset.run, {})).rejects.toThrow(hostedError);
  vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
  await expect(owner.test.mutation(api.routes.dev.reset.run, {})).resolves.toBeGreaterThan(0);
  await owner.test.run(async (ctx) => {
    expect(await ctx.db.query('trips').first()).toBeNull();
  });
});
