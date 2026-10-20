import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { setupWritableTrip, tripLocationInput } from '#testing/trips';

const screen = {
  capabilities: [],
  data: '{}',
  description: 'Workspace',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};
const catalog = api.routes.assistant.context.catalog.run;
const tags = api.routes.assistant.chats.tags.run;

afterEach(() => vi.unstubAllEnvs());

test('assistant catalogs and explicit tags enforce paid seats and recheck stored tags', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  const fixture = await setupWritableTrip(1);
  const { owner, sharedTripId, tripId, users } = fixture;
  const member = users[0]!;
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    tripId,
    input: tripLocationInput({ name: 'Protected draft destination', placeId: 'protected' })
  });
  const threadId = await member.client.action(api.routes.assistant.chats.create.run, { screen });
  expect(await member.client.query(catalog, {})).toEqual([]);
  await expect(
    member.client.mutation(tags, { threadId, tags: [{ kind: 'destination', id: destinationId }] })
  ).rejects.toThrow('Tagged trip not found');
  await expect(
    member.client.mutation(tags, { threadId, tags: [{ kind: 'trip', id: tripId }] })
  ).rejects.toThrow('Tagged trip not found');
  const paymentId = await owner.test.run(
    async (ctx) =>
      await ctx.db.insert('tripPayments', {
        attempt: 'fixture-paid',
        expiresAt: 1,
        paid: true,
        payerId: owner.userId,
        tripId: sharedTripId,
        userId: member.userId
      })
  );
  expect(await member.client.query(catalog, {})).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: destinationId, label: 'Protected draft destination' })
    ])
  );
  await member.client.mutation(tags, {
    threadId,
    tags: [{ kind: 'destination', id: destinationId }]
  });
  expect(
    await member.client.query(internal.modules.assistant.model.index.taggedContext, { threadId })
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: destinationId, label: 'Protected draft destination' })
    ])
  );
  await owner.test.run(
    async (ctx) => await ctx.db.patch('tripPayments', paymentId, { paid: false })
  );
  await expect(
    member.client.query(internal.modules.assistant.model.index.taggedContext, { threadId })
  ).rejects.toThrow('Tagged trip not found');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  expect(await member.client.query(catalog, {})).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: destinationId })])
  );
  await expect(
    member.client.mutation(tags, { threadId, tags: [{ kind: 'trip', id: tripId }] })
  ).resolves.toHaveLength(1);
});

test('legacy free trips remain available in assistant catalogs and tags after Stripe is enabled', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const { tripId, users } = await setupWritableTrip(1);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  const member = users[0]!;
  const threadId = await member.client.action(api.routes.assistant.chats.create.run, { screen });
  expect(await member.client.query(catalog, {})).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: tripId, kind: 'trip' })])
  );
  await expect(
    member.client.mutation(tags, { threadId, tags: [{ kind: 'trip', id: tripId }] })
  ).resolves.toHaveLength(1);
});
