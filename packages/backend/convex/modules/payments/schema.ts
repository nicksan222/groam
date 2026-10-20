import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const manualRefundStatus = v.union(v.literal('failed'), v.literal('canceled'));

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
    requestProtocol: v.optional(v.literal('persist-before-io-v1')),
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
    refundGeneration: v.optional(v.number()),
    refundHistory: v.optional(
      v.array(
        v.object({ refundId: v.string(), status: manualRefundStatus, generation: v.number() })
      )
    ),
    manualRefundStatus: v.optional(manualRefundStatus),
    lastResumeRequestId: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolutionReference: v.optional(v.string()),
    nextAttemptAt: v.number(),
    leaseUntil: v.optional(v.number())
  })
    .index('by_paymentId_and_attempt', ['paymentId', 'attempt'])
    .index('by_manualRefundStatus_and_resolvedAt_and_nextAttemptAt', [
      'manualRefundStatus',
      'resolvedAt',
      'nextAttemptAt'
    ])
};

export const PaymentValidators = {
  status: v.object({
    archived: v.boolean(),
    enabled: v.boolean(),
    travelers: v.array(v.object({ userId: v.string(), paid: v.boolean(), free: v.boolean() }))
  }),
  checkout: v.object({ url: v.union(v.string(), v.null()), skipped: v.boolean() })
};
