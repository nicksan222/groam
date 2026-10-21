import type { Id } from '#convex-generated/dataModel';
import type { createTest } from '#testing/factory';
import { setupTrip, setupWritableTrip } from '#testing/trips';

/** Inspect persisted cleanup results without routing through a deleted organization's auth. */
export function paymentCleanupState(test: ReturnType<typeof createTest>, tripId: Id<'trips'>) {
  return test.run(async (ctx) => ({
    tripExists: (await ctx.db.get('trips', tripId)) !== null,
    payments: await ctx.db
      .query('tripPayments')
      .withIndex('by_tripId_and_userId', (query) => query.eq('tripId', tripId))
      .take(101)
  }));
}

export function paymentReconciliationState(test: ReturnType<typeof createTest>) {
  return test.run((ctx) => ctx.db.query('paymentReconciliations').take(101));
}

/** An older checkout version could issue provider I/O before persisting its request. */
export function legacyUnrecordedPayment(
  test: ReturnType<typeof createTest>,
  id: Id<'tripPayments'>
) {
  return test.run((ctx) => ctx.db.patch(id, { requestProtocol: undefined }));
}

/** Model a billable trip explicitly, independently of the production activation rollout. */
export async function markTripBillable(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  tripId: Id<'trips'>
) {
  await owner.test.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected a fixture trip');
    await ctx.db.patch('trips', tripId, { paymentsRequired: true });
    const travelers = await ctx.db
      .query('tripTravelers')
      .withIndex('by_tripId', (q) => q.eq('tripId', tripId))
      .collect();
    await Promise.all(
      travelers.map((traveler) =>
        ctx.db.patch('tripTravelers', traveler._id, {
          status: traveler.userId === trip.creator.userId ? 'going' : 'invited'
        })
      )
    );
  });
}

export async function setupBillableTrip(additionalMemberCount = 3) {
  const fixture = await setupTrip(additionalMemberCount);
  await markTripBillable(fixture.owner, fixture.tripId);
  return fixture;
}

export async function setupBillableWritableTrip(additionalMemberCount = 3) {
  const fixture = await setupWritableTrip(additionalMemberCount);
  await markTripBillable(fixture.owner, fixture.sharedTripId);
  return fixture;
}

/** Confirm seats for a bounded, explicit payment/read-budget fixture. */
export async function confirmFixtureSeats(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  tripId: Id<'trips'>,
  userIds: string[]
) {
  await owner.test.run(async (ctx) => {
    await Promise.all(
      userIds.map((userId) =>
        ctx.db.insert('tripPayments', {
          attempt: 'confirmed-budget-fixture',
          expiresAt: 1,
          paid: true,
          payerId: userId,
          tripId,
          userId
        })
      )
    );
  });
}
