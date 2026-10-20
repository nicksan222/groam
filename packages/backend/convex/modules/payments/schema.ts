import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const paymentTables = {
  tripPayments: defineTable({
    tripId: v.id('trips'),
    userId: v.string(),
    payerId: v.string(),
    attempt: v.string(),
    expiresAt: v.number(),
    sessionId: v.optional(v.string()),
    paid: v.boolean()
  }).index('by_tripId_and_userId', ['tripId', 'userId'])
};

export const PaymentValidators = {
  status: v.object({
    archived: v.boolean(),
    enabled: v.boolean(),
    travelers: v.array(v.object({ userId: v.string(), paid: v.boolean(), free: v.boolean() }))
  }),
  checkout: v.object({ url: v.union(v.string(), v.null()), skipped: v.boolean() })
};
