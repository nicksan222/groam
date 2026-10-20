import { v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { checkout } from '#convex/modules/payments/checkout';
import { PaymentValidators } from '#convex/modules/payments/schema';

export const run = workspaceAction({
  args: { tripId: v.id('trips'), userId: v.optional(v.string()) },
  returns: PaymentValidators.checkout,
  handler: checkout
});
