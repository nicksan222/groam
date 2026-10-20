import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { markTripBillable } from '#testing/payments';
import { setupTrip, paginationArgs, tripInput } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

async function mixedTrips() {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const fixture = await setupTrip(1);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_workspace');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_workspace');
  const paidTripId = await fixture.owner.client.action(api.routes.trips.create.run, {
    input: tripInput({
      name: 'Private planning trip',
      dateNotes: 'Secret departure window',
      destination: { status: 'known', name: 'Private destination' }
    })
  });
  await markTripBillable(fixture.owner, paidTripId);
  return { ...fixture, legacyTripId: fixture.tripId, member: fixture.users[0]!, paidTripId };
}

async function confirmSeat(fixture: Awaited<ReturnType<typeof mixedTrips>>) {
  const payment = await fixture.owner.client.mutation(internal.modules.payments.storage.prepare, {
    tripId: fixture.paidTripId,
    userId: fixture.member.userId
  });
  if (!payment) throw new Error('Expected a billable payment');
  await fixture.owner.client.mutation(internal.modules.payments.storage.complete, {
    id: payment.id,
    attempt: payment.attempt,
    sessionId: 'cs_verified_workspace_fixture'
  });
}

test('trip lists redact unpaid planning summaries on normal and favorite paths, preserving entitled access', async () => {
  const fixture = await mixedTrips();
  const { owner, member, paidTripId, legacyTripId } = fixture;
  const list = () => member.client.query(api.routes.trips.list.run, paginationArgs);
  const redacted = {
    id: paidTripId,
    name: 'Private planning trip',
    dateNotes: null,
    destination: null,
    nextAction: 'Join this trip to start planning',
    outstandingActionCount: 0
  };
  expect((await list()).page.find((trip) => trip.id === paidTripId)).toMatchObject(redacted);
  expect((await list()).page.some((trip) => trip.id === legacyTripId)).toBe(true);
  const visible = {
    dateNotes: 'Secret departure window',
    destination: 'Private destination',
    nextAction: 'Continue planning together'
  };
  expect(
    (await owner.client.query(api.routes.trips.list.run, paginationArgs)).page.find(
      (trip) => trip.id === paidTripId
    )
  ).toMatchObject(visible);

  // A seat can already be favorited when a previously enabled installation skips billing.
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await member.client.mutation(api.routes.trips.preferences.favorite.run, {
    tripId: paidTripId,
    favorite: true
  });
  expect((await list()).page.find((trip) => trip.id === paidTripId)).toMatchObject(visible);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_workspace');
  expect((await list()).page.find((trip) => trip.id === paidTripId)).toMatchObject({
    ...redacted,
    favorite: true
  });

  await confirmSeat(fixture);
  expect((await list()).page.find((trip) => trip.id === paidTripId)).toMatchObject(visible);
});

test('workspace issues skip unpaid trips before projecting facts and preserve pagination progress', async () => {
  const fixture = await mixedTrips();
  const { owner, member, legacyTripId, paidTripId } = fixture;
  const legacyIssue = await owner.client.mutation(api.routes.trips.issues.create.run, {
    tripId: legacyTripId,
    title: 'Visible legacy issue',
    body: 'Legacy planning'
  });
  const privateIssue = await owner.client.mutation(api.routes.trips.issues.create.run, {
    tripId: paidTripId,
    title: 'Private paid issue',
    body: 'Hidden planning'
  });
  const list = () =>
    member.client.query(api.routes.trips.issues.workspace.list.run, paginationArgs);
  const visible = await list();
  expect(visible.page.some((issue) => issue.id === legacyIssue)).toBe(true);
  expect(visible.page.every((issue) => issue.tripId === legacyTripId)).toBe(true);
  expect(
    (
      await owner.client.query(api.routes.trips.issues.workspace.list.run, paginationArgs)
    ).page.some((issue) => issue.id === privateIssue)
  ).toBe(true);

  const first = await member.client.query(api.routes.trips.issues.workspace.list.run, {
    paginationOpts: { cursor: null, numItems: 1 }
  });
  expect(first.page).toEqual([]);
  expect(first.isDone).toBe(false);
  let cursor = first.continueCursor;
  const titles: string[] = [];
  for (let page = 0; page < 50; page += 1) {
    const result = await member.client.query(api.routes.trips.issues.workspace.list.run, {
      paginationOpts: { cursor, numItems: 1 }
    });
    titles.push(...result.page.map((issue) => issue.title));
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
  expect(titles).toContain('Visible legacy issue');
  expect(titles).not.toContain('Private paid issue');

  vi.stubEnv('STRIPE_SECRET_KEY', '');
  expect((await list()).page.some((issue) => issue.id === privateIssue)).toBe(true);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_workspace');
  await confirmSeat(fixture);
  expect((await list()).page.some((issue) => issue.id === privateIssue)).toBe(true);
});
