import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { enablePayments, stubStripe } from '#testing/payments';
import { openTripDraft, setupTrip } from '#testing/trips';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const create = api.routes.discussions.create.run;

test('creates a chat in a trip for members who hold seats', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const [member] = users;
  const discussionId = await owner.client.mutation(create, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member!.userId],
    title: 'Dinner plans',
    tripId
  });
  expect(discussionId).toEqual(expect.any(String));
});

test('refuses a member without a seat, whether they ask or are asked', async () => {
  vi.useFakeTimers();
  enablePayments();
  stubStripe();
  const { owner, tripId, users } = await setupTrip(1);
  const [unpaid] = users;
  await expect(
    unpaid!.client.mutation(create, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: [owner.userId],
      title: 'Let me in',
      tripId
    })
  ).rejects.toThrow('Trip not found');
  await expect(
    owner.client.mutation(create, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: [unpaid!.userId],
      title: 'Add them',
      tripId
    })
  ).rejects.toThrow('needs a seat on the trip');
});

test('refuses a chat in an archived trip', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(
    owner.client.mutation(create, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: [users[0]!.userId],
      title: 'Too late',
      tripId
    })
  ).rejects.toThrow('This trip is archived');
});

test('refuses a chat on an idea working copy', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const draft = await openTripDraft(owner, tripId);
  await expect(
    owner.client.mutation(create, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: [users[0]!.userId],
      title: 'On a draft',
      tripId: draft.workingTripId
    })
  ).rejects.toThrow('shared trip');
});

test('the roster for a trip chat lists only members who hold a seat', async () => {
  vi.useFakeTimers();
  enablePayments();
  stubStripe();
  const { owner, tripId, users } = await setupTrip(1);
  const roster = api.routes.discussions.roster.run;
  expect((await owner.client.query(roster, {})).map((member) => member.userId)).toContain(
    users[0]!.userId
  );
  expect(await owner.client.query(roster, { tripId })).toEqual([]);
});
