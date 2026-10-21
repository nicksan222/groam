# Trip payments

Groam sells one thing: a €1 seat for one traveler on one trip, paid once through Stripe Checkout.
The trip creator never pays. Travelers pay for themselves, or an organizer covers another group
member from **Travelers → Trip access**. The code lives in
`packages/backend/convex/modules/payments/`.

## Configuration

Set both secrets on the Convex deployment:

- `STRIPE_SECRET_KEY`: the Stripe secret API key (a test key while verifying).
- `STRIPE_WEBHOOK_SECRET`: the signing secret of that deployment's webhook endpoint.

Add a Stripe webhook endpoint at `https://<deployment>.convex.site/stripe/webhook` subscribed to
`checkout.session.completed`. Checkout returns to the trip at `SITE_URL`. The price is fixed in
code, so no Stripe Price is needed. Payments are on only when both secrets are set; with either one
missing, every trip is free and the payment panel stays hidden.

## Access rules

- Only trips created while payments are on charge for seats (`trips.paymentRequired`). Trips created
  before then stay free.
- The trip creator is free. Every other member needs a paid or covered seat.
- A seat gates the trip's own pages: trip queries and mutations, and the trip page itself, which
  shows the paywall instead. Group-wide feeds and standalone idea, issue, conversation, and
  agent-run pages stay visible to every group member.

## Seat or refund

Returning from Checkout grants nothing; only a paid session confirmed by Stripe does, through the
signed webhook or a server-side read of the session when Checkout is opened again. Every paid
session becomes exactly one seat or one refund: if the seat is already paid, the trip was archived,
payment is no longer required, the traveler left the group, or the amount does not match, the
session is refunded automatically. Refunds are idempotent per session and retried with backoff for
several hours.

## When an automatic refund fails

After the last retry, the Convex logs show
`Refund for Stripe session <id> failed; refund it in Stripe.` Open that Checkout session in the
Stripe dashboard (Payments → search the session id), open its payment, and choose **Refund** for
the full amount. No database change is needed: the session never became a seat.
