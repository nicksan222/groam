# Trip payments

Groam sells one thing: a €1 seat for one traveler on one trip, paid once through Stripe Checkout.
The trip creator never pays. Travelers pay for themselves, or an organizer covers another group
member from **People → Seats**. Seat rules, tables, and refunds live in
`packages/backend/convex/modules/payments/`; the payment provider sits behind the
`PaymentProvider` interface in `packages/payments/`, so the backend never calls a payment API
directly.

## Configuration

Set both secrets on the Convex deployment:

- `STRIPE_SECRET_KEY`: the Stripe secret API key (a test key while verifying).
- `STRIPE_WEBHOOK_SECRET`: the signing secret of that deployment's webhook endpoint.

Add a Stripe webhook endpoint at `https://<deployment>.convex.site/payments/webhook` subscribed to
`checkout.session.completed`. Checkout returns to the trip's People section at `SITE_URL`. The price is fixed in
code, so no Stripe Price is needed.

With either secret missing, as in local development and tests, the pass provider is used instead:
every traveler already holds a paid seat, nothing is charged, and the payment panel stays hidden.
Seat checks run the same way in every environment; nothing is skipped.

## Access rules

- Every new trip needs seats (`trips.paymentRequired`). Trips created before seats were tracked
  stay free.
- The trip creator is free. Every other member needs a paid or covered seat.
- A seat gates everything that shows a trip's content, answering with the same not-found errors
  as the trip pages:
  - the trip page and its queries and mutations (which also refuse organization admins without a
    seat);
  - agent runs on a trip: run pages, logs and events, the latest run of an issue or idea, and
    the run lists and roster (runs on trips without the viewer's seat are left out);
  - trip polls (reads, lists, creation, voting) and research discussions with their assistant
    thread; travelers without a seat are not eligible voters, so they never hold up "everyone
    voted" or percentage rules;
  - assistant context: tagging a trip or its items, tag details, and the tag catalog. In a shared
    chat, tags another member added on a trip the viewer has no seat on stay out of their
    context and are kept as stored when they edit tags;
  - wait conditions on issues, ideas, RSVPs, and polls. An agent run can only watch what its
    creator can read, and a viewer without a seat on the trip sees such a wait only as "Waiting on
    a trip you haven't joined", without its label or progress.
- Group-wide, without a seat: feeds, standalone idea, issue, and conversation pages, the media
  library, and notifications. An issue page stays visible, but its agent run is not.
## Seat or refund

Returning from Checkout grants nothing; only a paid checkout confirmed by the provider does,
through the signed webhook or a server-side read of the checkout when it is opened again. Every paid
session becomes exactly one seat or one refund: if the seat is already paid, the trip was archived,
payment is no longer required, the traveler left the group, or the amount does not match, the
session is refunded automatically. Refunds are idempotent per session and retried with backoff for
several hours.

## When an automatic refund fails

After the last retry, the Convex logs show
`Refund for Stripe checkout <id> failed; refund it in Stripe.` Open that Checkout session in the
Stripe dashboard (Payments → search the session id), open its payment, and choose **Refund** for
the full amount. No database change is needed: the session never became a seat.
