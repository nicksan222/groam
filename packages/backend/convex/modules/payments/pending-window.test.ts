import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { markTripBillable } from '#testing/payments';
import { setupTrip, tripInput } from '#testing/trips';

const pending = api.routes.trips.versions.workspace.pending.page.run;
afterEach(() => vi.unstubAllEnvs());
function enable() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_pending');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_pending');
}

test(
  'pending pages advance through50hidden authored drafts to an older accessible draft',
  { timeout: 60_000 },
  async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const fixture = await setupTrip(1);
    const member = fixture.users[0]!;
    const legacy = await member.client.mutation(api.routes.trips.versions.create.run, {
      tripId: fixture.tripId,
      title: 'Older accessible draft'
    });
    const billableTrips: (typeof fixture.tripId)[] = [];
    for (let index = 0; index < 50; index += 1) {
      enable();
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each source is created billable before its formerly-accessible draft is made with billing skipped.
      const tripId = await fixture.owner.client.action(api.routes.trips.create.run, {
        input: tripInput()
      });
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Explicit activation keeps this fixture valid before the production rollout layer.
      await markTripBillable(fixture.owner, tripId);
      billableTrips.push(tripId);
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Ordered drafts must follow the older accessible draft in the author index.
      await member.client.mutation(api.routes.trips.versions.create.run, {
        tripId,
        title: `Protected draft ${index}`
      });
    }
    enable();
    const first = await member.client.query(pending, {
      paginationOpts: { cursor: null, numItems: 50 }
    });
    expect(first.page).toEqual([]);
    expect(first.isDone).toBe(false);
    expect(first.continueCursor).toBeTruthy();
    const next = await member.client.query(pending, {
      paginationOpts: { cursor: first.continueCursor, numItems: 50 }
    });
    expect(next.page.map((idea) => idea.id)).toEqual([legacy.proposalId]);
    expect(next.isDone).toBe(true);
    const otherAuthor = await fixture.owner.client.query(pending, {
      paginationOpts: { cursor: null, numItems: 50 }
    });
    expect(otherAuthor.page).toEqual([]);
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const disabled = await member.client.query(pending, {
      paginationOpts: { cursor: null, numItems: 1000 }
    });
    expect(disabled.page).toHaveLength(50);
    enable();
    const lastTrip = billableTrips.at(-1)!;
    const seat = (await fixture.owner.client.mutation(internal.modules.payments.storage.prepare, {
      tripId: lastTrip,
      userId: member.userId
    }))!;
    await fixture.owner.client.mutation(internal.modules.payments.storage.complete, {
      id: seat.id,
      attempt: seat.attempt,
      sessionId: 'cs_pending'
    });
    expect(
      (await member.client.query(pending, { paginationOpts: { cursor: null, numItems: 50 } })).page
    ).toHaveLength(1);
  }
);

test('non-open authored ideas preserve the raw cursor to older pending ideas', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const fixture = await setupTrip(1);
  const member = fixture.users[0]!;
  const older = await member.client.mutation(api.routes.trips.versions.create.run, {
    tripId: fixture.tripId,
    title: 'Still open'
  });
  const newerTrip = await member.client.action(api.routes.trips.create.run, { input: tripInput() });
  const closed = await member.client.mutation(api.routes.trips.versions.create.run, {
    tripId: newerTrip,
    title: 'Already closed'
  });
  await member.client.mutation(api.routes.trips.versions.close.run, {
    proposalId: closed.proposalId
  });
  const first = await member.client.query(pending, {
    paginationOpts: { cursor: null, numItems: 1 }
  });
  expect(first.page).toEqual([]);
  expect(first.isDone).toBe(false);
  const next = await member.client.query(pending, {
    paginationOpts: { cursor: first.continueCursor, numItems: 1 }
  });
  expect(next.page.map((idea) => idea.id)).toEqual([older.proposalId]);
  expect(next.isDone).toBe(true);
});
