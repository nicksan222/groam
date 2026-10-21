import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { inviteFixtureTravelers, setupBillableTrip, paymentCleanupState } from '#testing/payments';

import { tripInput } from '#testing/trips';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configurePayments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) =>
      Response.json({
        id: 'cs_cleanup',
        url: 'https://checkout.stripe.com/c/pay/cleanup',
        status: 'open',
        payment_status: init?.method === 'GET' ? 'paid' : 'unpaid',
        amount_total: 100,
        currency: 'eur',
        metadata: {}
      })
    )
  );
}

test('public organization deletion removes payment identifiers in multiple bounded batches', async () => {
  configurePayments();
  vi.useFakeTimers();
  const { owner, tripId, users } = await setupBillableTrip(51);
  for (const member of users) {
    await owner.client.action(api.routes.trips.payments.checkout.run, {
      tripId,
      userId: member.userId
    });
  }
  await owner.client.action(api.routes.trips.payments.checkout.run, {
    tripId,
    userId: users[0]!.userId
  });
  const before = await paymentCleanupState(owner.test, tripId);
  expect(before.payments).toHaveLength(51);
  expect(before.payments.filter((payment) => payment.paid)).toHaveLength(1);
  const deletion = await owner.authClient.organization.delete({
    organizationId: owner.organizationId!
  });
  expect(deletion.error).toBeNull();
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await paymentCleanupState(owner.test, tripId)).toEqual({
    tripExists: false,
    payments: []
  });
}, 60_000);

test('organization deletion preserves another organization payment rows', async () => {
  configurePayments();
  vi.useFakeTimers();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  await owner.client.action(api.routes.trips.payments.checkout.run, {
    tripId,
    userId: member.userId
  });
  const otherOrganization = await owner.authClient.organization.create({
    name: 'Other group',
    slug: 'other-payment-cleanup'
  });
  expect(otherOrganization.error).toBeNull();
  const otherOrganizationId = otherOrganization.data!.id;
  expect(
    (await owner.authClient.organization.setActive({ organizationId: otherOrganizationId })).error
  ).toBeNull();
  const invitation = await owner.client.mutation(api.routes.organizations.invitations.create.run, {
    role: 'member'
  });
  await member.client.mutation(api.routes.organizations.invitations.redeem.run, {
    code: invitation.code
  });
  const otherTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  await inviteFixtureTravelers(owner, otherTripId);
  await owner.client.action(api.routes.trips.payments.checkout.run, {
    tripId: otherTripId,
    userId: member.userId
  });
  expect((await paymentCleanupState(owner.test, otherTripId)).payments).toHaveLength(1);
  expect(
    (await owner.authClient.organization.setActive({ organizationId: owner.organizationId! })).error
  ).toBeNull();
  expect(
    (await owner.authClient.organization.delete({ organizationId: owner.organizationId! })).error
  ).toBeNull();
  await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await paymentCleanupState(owner.test, tripId)).toEqual({
    tripExists: false,
    payments: []
  });
  const other = await paymentCleanupState(owner.test, otherTripId);
  expect(other.tripExists).toBe(true);
  expect(other.payments).toHaveLength(1);
  expect(other.payments[0]).toMatchObject({ payerId: owner.userId, userId: member.userId });
});
