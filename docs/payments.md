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
