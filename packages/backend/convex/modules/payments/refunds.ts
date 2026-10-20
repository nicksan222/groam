import { z } from 'zod';
import type { Doc } from '#convex-generated/dataModel';
import { env } from '#convex-generated/server';
import {
  CheckoutCreationExpired,
  isPaid,
  stripeRequest,
  stripeKeyHash,
  type CheckoutSession
} from './stripe';

async function refundRequest(path: string, body?: URLSearchParams, key?: string) {
  // fallow-ignore-next-line security-sink -- fixed HTTPS Stripe API origin; only encoded refund IDs; redirects refused
  const response = await fetch(`https://api.stripe.com/v1/refunds${path}`, {
    method: body ? 'POST' : 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {})
    },
    ...(body ? { body: body.toString() } : {})
  });
  if (!response.ok) throw new Error('Payment reconciliation requires retry');
  return z.object({ id: z.string(), status: z.string().nullable() }).parse(await response.json());
}

export type ReconciliationOutcome = {
  terminal: boolean;
  refundId?: string;
  manualRefundStatus?: 'failed' | 'canceled';
};

async function refund(
  row: Doc<'paymentReconciliations'>,
  session: CheckoutSession
): Promise<ReconciliationOutcome> {
  if (!session.payment_intent) return { terminal: false };
  const result = row.refundId
    ? await refundRequest(`/${encodeURIComponent(row.refundId)}`)
    : await refundRequest(
        '',
        new URLSearchParams({ payment_intent: session.payment_intent }),
        `groam-deleted-${row.paymentId}-${row.attempt}-${session.id}${row.refundGeneration ? `-retry-${row.refundGeneration}` : ''}`
      );
  if (result.status === 'failed' || result.status === 'canceled')
    return { terminal: false, refundId: result.id, manualRefundStatus: result.status };
  return { terminal: result.status === 'succeeded', refundId: result.id };
}

async function sessionFor(row: Doc<'paymentReconciliations'>) {
  if (row.sessionId) return stripeRequest(`/${encodeURIComponent(row.sessionId)}`);
  if (
    !row.checkoutBody ||
    !row.providerKeyHash ||
    row.providerKeyHash !== (await stripeKeyHash()) ||
    Math.floor(Date.now() / 1000) > row.expiresAt + 22 * 3600
  )
    return null;
  return stripeRequest(
    '',
    new URLSearchParams(row.checkoutBody),
    `groam-trip-${row.paymentId}-${row.attempt}`
  );
}

export async function reconcileStripe(
  row: Doc<'paymentReconciliations'>,
  rememberSession: (sessionId: string) => Promise<boolean>
): Promise<ReconciliationOutcome> {
  let session: CheckoutSession | null;
  try {
    session = await sessionFor(row);
  } catch (error) {
    if (error instanceof CheckoutCreationExpired) return { terminal: true };
    throw error;
  }
  if (!session) return { terminal: false };
  if (!row.sessionId && !(await rememberSession(session.id))) return { terminal: false };
  if (session.status === 'open' && !isPaid(session)) {
    try {
      session = await stripeRequest(
        `/${encodeURIComponent(session.id)}/expire`,
        new URLSearchParams()
      );
    } catch {
      session = await stripeRequest(`/${encodeURIComponent(session.id)}`);
    }
  }
  if (isPaid(session)) return refund(row, session);
  return { terminal: session.status === 'expired' };
}
