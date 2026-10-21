import { paymentStatus } from '#convex/modules/payments/index';
import { PaymentValidators } from '#convex/modules/payments/schema';
import { previewSharedTripQuery } from '#convex/modules/travel/trips/ctx';

export const run = previewSharedTripQuery({
  args: {},
  returns: PaymentValidators.status,
  handler: paymentStatus
});
