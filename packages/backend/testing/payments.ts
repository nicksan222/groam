import type { Id } from '#convex-generated/dataModel';
import type { createTest } from '#testing/factory';

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
