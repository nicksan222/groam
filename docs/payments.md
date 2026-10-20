# Trip payments

Groam charges **€1 per traveler per trip**, once. The trip creator is free.
Travelers can pay for themselves, and trip organizers can cover another current
group member from **Travelers → Trip access**. This is a one-time Stripe Checkout
payment, not a subscription.

## Optional configuration

Convex remains the backend for authorization, checkout creation, payment records,
and Stripe webhooks. Configure these secrets on the intended Convex deployment:

- `STRIPE_SECRET_KEY`: Stripe secret API key. Use a test key while verifying the
  integration.
- `STRIPE_WEBHOOK_SECRET`: signing secret for that deployment's Stripe webhook
  endpoint.
- `SITE_URL`: the public web app origin used for checkout return URLs.

Without `STRIPE_SECRET_KEY`, payment requirements are skipped and the payment
panel is hidden. Developers and self-hosted installations can use the application
without Stripe. When enabling Stripe, configure its webhook secret too; incomplete
configuration must not create a checkout that cannot be confirmed.

Configure a Stripe webhook at `https://<deployment>.convex.site/stripe/webhook`
using the Convex HTTP origin, and subscribe to `checkout.session.completed`.
Checkout supports immediate card payments. No Stripe Price ID is needed: the
backend fixes the price to 100 euro cents.

Payment requirements apply to trips created while payments are enabled. Existing
trips retain their original access behavior. Removing the Stripe key skips
payment requirements rather than locking users out.

## Confirmation and access

An unpaid traveler on a trip requiring payment begins as **Invited**. Opening
Checkout or returning from Stripe does not mark a traveler paid. The backend
accepts a verified payment confirmation and updates the payment record. The UI
subscribes to that record through Convex, so confirmed payments appear without a
manual refresh.

Organizers can pay for another member but cannot mark them paid directly. Paid
travelers are not charged again. Archived trips do not accept new payments.
Delayed payment confirmation must preserve a later explicit RSVP and must not
restore an archived trip.

## Before accepting live payments

Use Stripe test mode to verify self-payment, organizer coverage, checkout retry,
and webhook redelivery. Check that the webhook belongs to the same Convex
deployment and Stripe mode as the API key. Confirm that returning from an unpaid
or canceled checkout does not grant paid access. Switch to live keys only after
the verified webhook path works with the deployed frontend's `SITE_URL`.

## Recovering an ambiguous checkout

Retries reuse the same Stripe idempotency key and session. If a request may have
reached Stripe but its session could not be persisted for more than 23 hours,
Groam stops automatic retries before Stripe can prune the key. Reconcile the
reservation with the matching session in the correct Stripe account before
allowing another charge. Do not delete the reservation or retry with a new key
without checking whether its original session was paid.


## Deleted trips and unconfirmed Checkout

Trip deletion removes payment records already confirmed locally without requesting
automatic refunds. Reservations still locally unconfirmed move to durable
reconciliation records before the trip data is removed. Late session persistence
and verified webhook events continue to find those records.

The reconciler expires open Checkout sessions. If Stripe reports a paid session
for a detached, unconfirmed reservation, it requests a full refund using a stable
idempotency key. Pending or failed refunds retain their reconciliation record
until successful; missing credentials, provider errors, and unknown outcomes also
retain the record. This cleanup handles payment/deletion races; published
cancellation and refund terms remain an owner and legal review item.

A bounded sweep retries up to 50 due records every 15 minutes with backoff. After
restoring the correct credentials, operators can invoke the internal
`modules/payments/reconciliation:sweep` mutation to schedule another attempt.
Known session IDs can be retrieved after key rotation. Unknown sessions can only
be recovered automatically within the original 23-hour retry window and with the
original Stripe key fingerprint and exact Checkout request. Older ambiguous
requests require reconciliation in the correct Stripe account. Never delete a
reconciliation record while the charge or refund outcome is unknown.

### Failed or canceled refunds need an operator

Stripe treats `failed` and `canceled` refunds as failures; a failed refund can require an alternative
way to reimburse the customer. See [Stripe refund handling](https://docs.stripe.com/refunds#handle-failed-refunds)
and [refund cancellation](https://docs.stripe.com/api/refunds/cancel). Groam moves those receipts to
an explicit manual queue. Cron sweeps, ordinary reconciliation actions, and duplicate payment
webhooks cannot retry them or silently create another refund.

Use the deployment's **internal** `modules/payments/reconciliation:listManual` query with
`{"status":"failed","paginationOpts":{"numItems":25,"cursor":null}}`; repeat for `canceled`.
Follow the returned cursor for subsequent pages. Inspection is bounded to 50 rows per page and
omits the original Checkout request and personal account fields.

Before taking action, verify the deployment/Stripe account and inspect the exact refund and
underlying payment in Stripe Dashboard. Check the failure reason, disputes, prior reimbursements,
and whether the customer already received money. Resolve the cause and contact the customer as
needed. Do not retry merely because a refund failed: Stripe may require an alternative remedy.

If a fresh Stripe refund is appropriate, explicitly invoke the internal
`modules/payments/reconciliation:resumeManual` mutation with the reconciliation `id`, its current
`expectedRefundId`, and a stable `requestId` of 8–100 characters identifying this operator decision.
Retrying that same operator request is idempotent. Each approved decision archives the old receipt
and creates one new refund generation with its own stable Stripe idempotency key. Stale refund IDs
are rejected. A case permits at most ten explicit retry generations and retains all earlier
failed/canceled refund receipts rather than overwriting them.

If the customer was reimbursed separately, or an external Stripe refund already settled, verify
that evidence first. Invoke internal `modules/payments/reconciliation:resolveManual` with `id`, the
current `expectedRefundId`, and a `resolutionReference` of 10–300 characters pointing to the verified
receipt or support case. This is an operator attestation, not automatic provider verification.
Store no customer personal details in that reference. The resolved record retains its original
refund evidence and reference for audit, leaves the active manual queue, and cannot be resumed.

Never delete an uncertain reconciliation record to clear a queue. Missing credentials, provider
404s, and unknown old Checkout outcomes remain unresolved until the correct account/session can
be reconciled. For attempts created by the persist-before-I/O protocol, cleanup can discard a
reservation with neither a stored request nor a session: the provider request cannot have started.
Older unmarked reservations do not have that proof and remain conservatively retained.
