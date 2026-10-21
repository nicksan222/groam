import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { inviteFixtureTravelers, setupBillableWritableTrip } from '#testing/payments';
import { setupWritableTrip, tripInput, tripLocationInput } from '#testing/trips';

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
  const fixture = await setupBillableWritableTrip(1);
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
  const freePage = await member.client.query(api.routes.assistant.context.catalog.page.run, {
    paginationOpts: { cursor: null, numItems: 25 }
  });
  expect(freePage.page).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: destinationId })])
  );
  expect(await member.client.query(catalog, {})).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: destinationId })])
  );
  await expect(
    member.client.mutation(tags, { threadId, tags: [{ kind: 'trip', id: tripId }] })
  ).resolves.toHaveLength(1);
});

test('enabling Stripe removes previously accessible trips from assistant catalogs and tags', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const { tripId, users } = await setupWritableTrip(1);
  const member = users[0]!;
  const threadId = await member.client.action(api.routes.assistant.chats.create.run, { screen });
  await member.client.mutation(tags, { threadId, tags: [{ kind: 'trip', id: tripId }] });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  expect(await member.client.query(catalog, {})).toEqual([]);
  await expect(
    member.client.mutation(tags, { threadId, tags: [{ kind: 'trip', id: tripId }] })
  ).rejects.toThrow('Tagged trip not found');
  await expect(
    member.client.query(internal.modules.assistant.model.index.taggedContext, { threadId })
  ).rejects.toThrow('Tagged trip not found');
});

test('assistant catalogs find older paid trips beyond more than 25 newer unpaid trips', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  const { owner, sharedTripId, tripId, users } = await setupBillableWritableTrip(1);
  const member = users[0]!;
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    tripId,
    input: tripLocationInput({ name: 'Older accessible destination', placeId: 'older-visible' })
  });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  await owner.test.run(async (ctx) => {
    await ctx.db.patch('trips', sharedTripId, { updatedAt: 1 });
    await ctx.db.patch('trips', tripId, { updatedAt: 1 });
    await ctx.db.insert('tripPayments', {
      attempt: 'older-paid',
      expiresAt: 1,
      paid: true,
      payerId: owner.userId,
      tripId: sharedTripId,
      userId: member.userId
    });
  });
  for (let index = 0; index < 28; index++) {
    const newerTripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ name: `Newer unpaid trip ${index}` })
    });
    await inviteFixtureTravelers(owner, newerTripId);
  }
  const firstPage = await member.client.query(api.routes.assistant.context.catalog.page.run, {
    paginationOpts: { cursor: null, numItems: 25 }
  });
  expect(firstPage.page).toEqual([]);
  expect(firstPage.isDone).toBe(false);
  expect(firstPage.continueCursor).toBeTruthy();
  const nextPage = await member.client.query(api.routes.assistant.context.catalog.page.run, {
    paginationOpts: { cursor: firstPage.continueCursor, numItems: 25 }
  });
  expect(nextPage.isDone).toBe(true);
  expect(nextPage.continueCursor).not.toBe(firstPage.continueCursor);
  const items = nextPage.page;
  expect(await member.client.query(catalog, {})).toEqual([]);
  expect(items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: sharedTripId, kind: 'trip' }),
      expect.objectContaining({ id: tripId, kind: 'trip' }),
      expect.objectContaining({ id: destinationId, label: 'Older accessible destination' })
    ])
  );
  expect(items.some((item) => item.label.startsWith('Newer unpaid trip'))).toBe(false);
  const creatorItems = await owner.client.query(catalog, {});
  expect(creatorItems.filter((item) => item.kind === 'trip')).toHaveLength(25);
  expect(creatorItems.some((item) => item.id === sharedTripId)).toBe(false);
  const cappedPage = await owner.client.query(api.routes.assistant.context.catalog.page.run, {
    paginationOpts: { cursor: null, numItems: 1000 }
  });
  expect(cappedPage.page.filter((item) => item.kind === 'trip')).toHaveLength(25);
  expect(cappedPage.isDone).toBe(false);
});
