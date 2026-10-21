import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { deliverCompleted, enablePayments, pay, paymentRows, stubStripe } from '#testing/payments';
import { setupTrip } from '#testing/trips';
import { removeMember } from '#testing/waits';

const status = api.routes.trips.payments.status.run;
const checkout = api.routes.trips.payments.checkout.run;
const rsvp = api.routes.trips.travelers.set.run;
const travelers = api.routes.trips.travelers.list.run;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function billableTrip() {
  vi.useFakeTimers();
  enablePayments();
  const stripe = stubStripe();
  const trip = await setupTrip(2);
  return { ...trip, member: trip.users[0]!, stripe };
}

async function openSession(trip: Awaited<ReturnType<typeof billableTrip>>) {
  const { url } = await trip.member.client.action(checkout, { tripId: trip.tripId });
  const session = [...trip.stripe.sessions.values()].find((item) => item.url === url);
  if (!session) throw new Error('Expected an open Checkout session');
  return session;
}

async function statusOf(trip: Awaited<ReturnType<typeof billableTrip>>, userId: string) {
  const roster = await trip.owner.client.query(travelers, { tripId: trip.tripId });
  return roster.find((traveler) => traveler.userId === userId)?.status;
}

test('payments stay off with only the secret key, and those trips stay free', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  expect(await member.client.action(checkout, { tripId })).toEqual({ url: null });
  expect((await owner.client.query(status, { tripId })).enabled).toBe(false);
  await member.client.mutation(rsvp, { tripId, status: 'going' });
  enablePayments();
  expect((await owner.client.query(status, { tripId })).enabled).toBe(false);
  expect((await member.client.query(api.routes.trips.get.run, { tripId })).canParticipate).toBe(
    true
  );
  await member.client.mutation(api.routes.trips.versions.create.run, { tripId });
});

test('unpaid members preview the trip, answer only for themselves, and see org feeds', async () => {
  const trip = await billableTrip();
  const { owner, member, tripId, addUser } = trip;
  const admin = await addUser('Unpaid admin', 'admin');
  const preview = await member.client.query(api.routes.trips.get.run, { tripId });
  expect(preview).toMatchObject({ canParticipate: false, destination: { status: 'undecided' } });
  expect(await statusOf(trip, member.userId)).toBe('invited');
  expect((await owner.client.query(status, { tripId })).travelers).toEqual(
    expect.arrayContaining([
      { userId: owner.userId, free: true, paid: false },
      { userId: member.userId, free: false, paid: false }
    ])
  );
  await expect(
    member.client.mutation(api.routes.trips.versions.create.run, { tripId })
  ).rejects.toThrow('Trip not found');
  await expect(member.client.mutation(rsvp, { tripId, status: 'going' })).rejects.toThrow('Pay €1');
  await expect(
    admin.client.mutation(rsvp, { tripId, userId: member.userId, status: 'not_going' })
  ).rejects.toThrow('only update your own RSVP');
  await member.client.mutation(rsvp, { tripId, status: 'maybe' });
  expect(await statusOf(trip, member.userId)).toBe('maybe');
  const list = await member.client.query(api.routes.trips.list.run, {
    paginationOpts: { cursor: null, numItems: 10 }
  });
  expect(list.page.find((item) => item.id === tripId)).toMatchObject({ destination: null });
  expect(await owner.client.action(checkout, { tripId })).toEqual({ url: null });
});

test('checkout enforces membership and sponsor permissions', async () => {
  const { owner, tripId, users } = await billableTrip();
  const outsider = await createOutsiderClient(owner.test);
  await expect(outsider.client.action(checkout, { tripId })).rejects.toThrow('Trip not found');
  await expect(
    users[0]!.client.action(checkout, { tripId, userId: users[1]!.userId })
  ).rejects.toThrow('Only organizers');
  await expect(owner.client.action(checkout, { tripId, userId: outsider.userId })).rejects.toThrow(
    'Traveler not found'
  );
});

test('a signed €1 webhook grants exactly one seat; repeat deliveries are no-ops', async () => {
  const trip = await billableTrip();
  const { owner, member, stripe, tripId } = trip;
  const session = await openSession(trip);
  expect(session).toMatchObject({ amount_total: 100, currency: 'eur' });
  expect(await owner.client.action(checkout, { tripId, userId: member.userId })).toEqual({
    url: session.url
  });
  expect(stripe.sessions.size).toBe(1);
  pay(session);
  expect((await deliverCompleted(owner.test, session)).status).toBe(200);
  expect((await deliverCompleted(owner.test, session)).status).toBe(200);
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await paymentRows(owner.test, tripId)).toEqual([
    expect.objectContaining({ paid: true, sessionId: session.id, userId: member.userId })
  ]);
  expect(await statusOf(trip, member.userId)).toBe('going');
  expect(await member.client.action(checkout, { tripId })).toEqual({ url: null });
  expect(stripe.refundKeys).toEqual([]);
});

test('expired checkout is replaced, and a second paid session for one seat is refunded', async () => {
  const trip = await billableTrip();
  const { owner, stripe, tripId } = trip;
  const first = await openSession(trip);
  first.status = 'expired';
  const second = await openSession(trip);
  expect(second.id).not.toBe(first.id);
  expect((await deliverCompleted(owner.test, pay(second))).status).toBe(200);
  expect((await deliverCompleted(owner.test, pay(first))).status).toBe(200);
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(stripe.refundKeys).toEqual([`groam-refund-${first.id}`]);
  expect((await paymentRows(owner.test, tripId))[0]).toMatchObject({ sessionId: second.id });
});

test('mismatched amounts and departed members are refunded, never seated', async () => {
  const trip = await billableTrip();
  const { owner, member, stripe, tripId } = trip;
  const session = await openSession(trip);
  await deliverCompleted(owner.test, { ...pay(session), amount_total: 50 });
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(stripe.refundKeys).toEqual([`groam-refund-${session.id}`]);
  expect(await statusOf(trip, member.userId)).toBe('invited');

  const other = trip.users[1]!;
  const { url } = await other.client.action(checkout, { tripId });
  const late = [...stripe.sessions.values()].find((item) => item.url === url)!;
  await removeMember(trip, other.userId);
  await deliverCompleted(owner.test, pay(late));
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(stripe.refundKeys).toContain(`groam-refund-${late.id}`);
  expect((await paymentRows(owner.test, tripId)).every((row) => !row.paid)).toBe(true);
});

test('deleting a trip expires open checkout and refunds a session paid afterwards', async () => {
  const trip = await billableTrip();
  const { owner, stripe, tripId } = trip;
  const session = await openSession(trip);
  const paidElsewhere = pay({ ...session, id: 'cs_test_orphan' });
  stripe.sessions.set(paidElsewhere.id, paidElsewhere);
  const deleted = await owner.authClient.organization.delete({
    organizationId: owner.organizationId!
  });
  expect(deleted.error).toBeNull();
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(session.status).toBe('expired');
  expect(await paymentRows(owner.test, tripId)).toEqual([]);
  await deliverCompleted(owner.test, paidElsewhere);
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(stripe.refundKeys).toEqual([`groam-refund-${paidElsewhere.id}`]);
});

test('webhooks reject bad signatures and ignore foreign or malformed metadata', async () => {
  const trip = await billableTrip();
  const { owner, stripe, tripId } = trip;
  const session = pay(await openSession(trip));
  expectConsole('error', /signature verification failed/u);
  expect((await deliverCompleted(owner.test, session, { secret: 'whsec_wrong' })).status).toBe(400);
  expect((await deliverCompleted(owner.test, session, { tamper: true })).status).toBe(400);
  const foreign: Record<string, string>[] = [
    {},
    { groamPaymentId: 'not-an-id', groamDeployment: session.metadata.groamDeployment! },
    { ...session.metadata, groamDeployment: 'https://another.convex.site' }
  ];
  for (const metadata of foreign) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each delivery is asserted in order.
    expect((await deliverCompleted(owner.test, { ...session, metadata })).status).toBe(200);
  }
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(stripe.refundKeys).toEqual([]);
  expect((await paymentRows(owner.test, tripId))[0]?.paid).toBe(false);
});

test('refunds retry a bounded number of times, then report for manual handling', async () => {
  const trip = await billableTrip();
  const session = await openSession(trip);
  trip.stripe.failRefunds = true;
  expectConsole('error', /refund it in Stripe/u);
  await deliverCompleted(trip.owner.test, { ...pay(session), currency: 'usd' });
  await trip.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(trip.stripe.refundKeys).toEqual([]);
});
