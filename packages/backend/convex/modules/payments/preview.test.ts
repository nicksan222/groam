import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setupBillableTrip } from '#testing/payments';
import { openTripDraft, tripActivityInput, tripLocationInput } from '#testing/trips';

const findTrip = api.routes.trips.find.run;
const getTrip = api.routes.trips.get.run;
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function enablePayments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_preview');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_preview');
}

async function protectedPlan() {
  const fixture = await setupBillableTrip(1);
  const version = await openTripDraft(fixture.owner, fixture.tripId);
  const tripId = version.workingTripId;
  await fixture.owner.client.mutation(api.routes.trips.update.run, {
    tripId,
    input: {
      name: 'Private plan preview',
      currency: 'EUR',
      destination: { status: 'undecided' },
      budget: { amount: 9876 },
      dateNotes: 'Private date notes',
      duration: { totalDays: 5 }
    }
  });
  const destinationId = await fixture.owner.client.mutation(api.routes.trips.destinations.add.run, {
    tripId,
    input: tripLocationInput()
  });
  await fixture.owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    tripId,
    destinationId,
    input: {
      ...tripActivityInput({ title: 'Private paid itinerary' }),
      cost: { amount: 4321 },
      notes: 'Private activity note'
    }
  });
  await fixture.owner.client.mutation(api.routes.trips.transfers.set.run, {
    tripId,
    boundary: 'arrival',
    input: { mode: 'train', notes: 'Private ticket details', cost: { amount: 2468 } }
  });
  return { ...fixture, version, previewTripId: tripId };
}

test('unpaid find/get responses redact protected plans and proposal contents before projection', async () => {
  // This timestamp contains a private cost's digits; substring checks must not mistake it for a leak.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1792534321919);
  enablePayments();
  const { owner, users, previewTripId, tripId } = await protectedPlan();
  const full = await owner.client.query(findTrip, { tripId: previewTripId });
  expect(full!.destinations[0]!.activities[0]!.title).toBe('Private paid itinerary');
  expect(full!.initialBudget).toBe(9876);
  expect(full!.arrivalTransfer!.notes).toBe('Private ticket details');
  expect(full!.proposal).not.toBeNull();
  for (const route of [findTrip, getTrip]) {
    const preview = await users[0]!.client.query(route, { tripId: previewTripId });
    expect(preview).toMatchObject({
      id: tripId,
      name: 'Summer beach idea',
      activity: [],
      destinations: [],
      arrivalTransfer: null,
      departureTransfer: null,
      initialBudget: null,
      totalPlannedCost: 0,
      proposal: null,
      dateNotes: null,
      totalDurationDays: null,
      permissions: { canPropose: false, canEdit: false, isReadOnly: true }
    });
    // Compare numeric values, not digit substrings that can occur in timestamps or IDs.
    const payload = JSON.stringify(preview, (_key, value: unknown) => {
      if (typeof value === 'number') expect([9876, 4321, 2468]).not.toContain(value);
      return value;
    });
    for (const secret of [
      'Private plan preview',
      'Private paid itinerary',
      'Private activity note',
      'Private ticket details',
      'Private date notes'
    ])
      expect(payload).not.toContain(secret);
  }
  expect((await users[0]!.client.query(findTrip, { tripId }))!.id).toBe(tripId);
});

test.each(['disabled', 'paid'])(
  '%s payment access retains full protected projections',
  async (access) => {
    enablePayments();
    const { owner, users, tripId, previewTripId } = await protectedPlan();
    if (access === 'disabled') vi.stubEnv('STRIPE_SECRET_KEY', '');
    if (access === 'paid') {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json({
            id: 'cs_preview',
            url: null,
            status: 'complete',
            payment_status: 'paid',
            amount_total: 100,
            currency: 'eur',
            metadata: {}
          })
        )
      );
      expect(
        await owner.client.action(api.routes.trips.payments.checkout.run, {
          tripId,
          userId: users[0]!.userId
        })
      ).toEqual({ skipped: true, url: null });
    }
    for (const route of [findTrip, getTrip]) {
      const full = await users[0]!.client.query(route, { tripId: previewTripId });
      expect(full!.id).toBe(previewTripId);
      expect(full!.destinations[0]!.activities[0]!.title).toBe('Private paid itinerary');
      expect(full!.arrivalTransfer!.notes).toBe('Private ticket details');
      expect(full!.initialBudget).toBe(9876);
      expect(full!.totalPlannedCost).toBeGreaterThan(0);
      expect(full!.proposal).not.toBeNull();
    }
  }
);

test('payment status on an unarchived idea reports its shared source archive state', async () => {
  enablePayments();
  const { owner, previewTripId, tripId } = await protectedPlan();
  expect(
    (await owner.client.query(api.routes.trips.payments.status.run, { tripId: previewTripId }))
      .archived
  ).toBe(false);
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  expect((await owner.client.query(getTrip, { tripId: previewTripId })).archivedAt).toBeNull();
  expect(
    (await owner.client.query(api.routes.trips.payments.status.run, { tripId: previewTripId }))
      .archived
  ).toBe(true);
});

test('an unpaid draft author receives the source trip header and participant role', async () => {
  enablePayments();
  const { owner, users, tripId } = await setupBillableTrip(1);
  const member = users[0]!;
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const draft = await openTripDraft(member, tripId);
  await member.client.mutation(api.routes.trips.update.run, {
    tripId: draft.workingTripId,
    input: {
      name: 'Private author draft title',
      currency: 'EUR',
      destination: { status: 'undecided' }
    }
  });
  const authorView = await member.client.query(getTrip, { tripId: draft.workingTripId });
  expect(authorView.role).toBe('participant');
  expect(authorView.id).toBe(draft.workingTripId);
  expect(authorView.name).toBe('Private author draft title');
  enablePayments();
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  const source = await owner.client.query(getTrip, { tripId });
  for (const route of [findTrip, getTrip]) {
    const preview = await member.client.query(route, { tripId: draft.workingTripId });
    expect(preview).toMatchObject({
      id: tripId,
      name: source.name,
      role: 'participant',
      archivedAt: source.archivedAt,
      coverUrl: source.coverUrl,
      coverStatus: source.coverStatus,
      proposal: null,
      permissions: { canPropose: false, canEdit: false, isReadOnly: true }
    });
    expect(preview!.archivedAt).not.toBeNull();
    expect(JSON.stringify(preview)).not.toContain('Private author draft title');
    expect(preview!.id).not.toBe(draft.workingTripId);
  }
});
