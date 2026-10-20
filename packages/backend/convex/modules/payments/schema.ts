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
    checkoutBody: v.optional(v.string()),
    providerKeyHash: v.optional(v.string()),
    paid: v.boolean()
  }).index('by_tripId_and_userId', ['tripId', 'userId']),
  paymentReconciliations: defineTable({
    paymentId: v.id('tripPayments'),
    attempt: v.string(),
    expiresAt: v.number(),
    sessionId: v.optional(v.string()),
    checkoutBody: v.optional(v.string()),
    providerKeyHash: v.optional(v.string()),
    revision: v.number(),
    leaseToken: v.optional(v.string()),
    refundId: v.optional(v.string()),
    nextAttemptAt: v.number(),
    leaseUntil: v.optional(v.number())
  })
    .index('by_paymentId_and_attempt', ['paymentId', 'attempt'])
    .index('by_nextAttemptAt', ['nextAttemptAt'])
};

export const PaymentValidators = {
  status: v.object({
    archived: v.boolean(),
    enabled: v.boolean(),
    travelers: v.array(v.object({ userId: v.string(), paid: v.boolean(), free: v.boolean() }))
  }),
  checkout: v.object({ url: v.union(v.string(), v.null()), skipped: v.boolean() })
};
