# Landing legal launch readiness

The privacy and terms pages are intentionally marked **Draft**. They describe confirmed product
behavior where the repository provides evidence, but they are not a substitute for owner decisions
and legal review. Do not remove the draft label or use these pages as sign-up acceptance terms until
the blockers below are resolved.

## Confirmed product behavior

- Convex handles real-email/password authentication, hosted email verification, password recovery,
  optional passkeys, and two-step verification. Transactional verification/recovery mail is delivered
  through Cloudflare Email Sending. Session records can include an IP address and user agent.
  Evidence: `packages/backend/convex/modules/auth/{auth,email,delivery}.ts`,
  `packages/backend/convex/components/better-auth/generated.ts`, and `packages/auth/README.md`.
- Trip access requires organization membership and, for billable trips, payment participation.
  Unpaid members receive a limited invitation preview rather than the protected itinerary. The trip
  creator is free, and trips created while billing is disabled remain free. An absent Stripe key
  skips billing on all trips. RSVP status alone does not narrow access. Evidence:
  `packages/backend/convex/modules/travel/trips/{visibility,projection}.ts` and
  `packages/backend/convex/modules/payments/participation.ts`.
- Deployment wiring publishes the landing and web frontends to Cloudflare Workers Static Assets;
  Convex remains the application backend. This is implementation evidence, not confirmation that
  production accounts, domains, credentials, or regions have been provisioned. Evidence:
  `tooling/deploy/` and `docs/deployment.md`.
- AI uses the selected user’s ChatGPT grant. Groam sends requests to OpenAI’s Responses API and sets
  `store: false`; Groam separately stores conversations, agent runs, and trip activity needed by the
  product. Evidence: `packages/backend/ai/chatgpt/provider.ts`,
  `packages/backend/convex/modules/ai/chatgpt/storage.ts`, and the assistant/discussion schemas.
- Uploaded covers and conversation media use Convex storage. Some replacement/removal paths delete
  unreferenced files, but there is no product-wide retention schedule. Evidence:
  `packages/backend/convex/modules/travel/covers/index.ts` and
  `packages/backend/convex/modules/discussions/media/index.ts`.
- Optional Stripe Checkout implements a one-time €1 payment per invited traveler per trip. Only
  the trip creator is exempt; other organizers pay unless covered. Travelers can pay for themselves,
  and organizers can cover a current member. Stripe hosts the payment form; Convex creates fixed-price
  Checkouts, verifies webhook confirmation, and stores participation/payment records. Absent or blank
  `STRIPE_SECRET_KEY` skips payments. A key without its webhook secret cannot start Checkout.
  Evidence: `packages/backend/convex/modules/payments/{index,storage,stripe,webhook}.ts`,
  `apps/web/src/features/trips/trip-travelers/trip-payments-panel.tsx`, and `docs/payments.md`.
- Unconfirmed sessions that become ineligible enter durable expiration/refund reconciliation.
  Missing credentials and ambiguous outcomes retain records; failed/canceled refunds enter an
  explicit operator queue with receipt history and a remediation runbook. Confirmed prior payments
  do not receive automatic refunds merely because a trip is later deleted. These technical recovery
  rules do not establish the complete customer cancellation/refund terms. Evidence:
  `packages/backend/convex/modules/payments/{reconciliation,refunds}.ts` and `docs/payments.md`.
- No optional analytics, advertising tracker, or landing-site cookie use was found. The web app uses
  authentication/session cookies through Better Auth.

## Publication blockers requiring owner or legal input

1. **Controller and contracting party:** legal name, legal form, registered address, country,
   company or tax identifiers where required, and a service/contact address.
2. **Privacy contact:** monitored email or request channel; data-protection officer or EU/UK
   representative details if applicable.
3. **Processing map:** purpose and lawful basis for each data category; whether invitee data is
   obtained indirectly; recipients/processors; controller/processor roles; and any joint-controller
   arrangements.
4. **International transfers:** production hosting regions, each recipient country, transfer
   mechanism, safeguards, and how a user can obtain a copy.
5. **Retention and deletion:** periods or objective criteria for accounts, sessions, invitations,
   trips, version history, discussions, AI runs, files, security logs, backups, and payment records.
   Decide and implement account closure, export, and deletion behavior before promising it.
6. **User rights process:** identity verification, response route, applicable supervisory authority,
   complaint handling, and regional rights language.
7. **Children and age:** minimum age, parental-consent approach if relevant, and whether the service
   is offered to children.
8. **Payments:** confirm the production Stripe account and contracting/merchant identity; finalize
   charge-trigger disclosures, taxes, receipts, failed payments, cancellation, refunds, statutory
   withdrawal rights, and the responsibility split between organizer, payer, and traveler. The
   implemented Checkout/reconciliation flows above are product facts, not completed legal terms.
9. **Terms framework:** acceptance event, governing law and forum, consumer protections, suspension
   and appeal, termination effects, content-license duration, warranty language, liability allocation,
   indemnity if appropriate, and change-notice procedure.
10. **Operational verification:** confirm the production provider list, regions, logs, backups,
    incident-response process, and whether any analytics or support tools are added before launch.

## Authoritative EU references

- [GDPR, Articles 12–14](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/) requires clear,
  accessible information including the controller’s identity and contact details, processing
  purposes and legal bases, recipients, international-transfer information, retention period or
  criteria, and data-subject rights. Article 14 adds requirements where personal data did not come
  directly from the person, which may apply to group invitations.
- [ePrivacy Directive 2002/58/EC, Article 5(3)](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A02002L0058-20091219+)
  requires consent and clear information for storage or access on a user’s device unless it is
  strictly necessary for a service the user requested. This supports omitting a consent banner while
  the site uses only necessary authentication/session storage; reassess before adding optional
  analytics or advertising technology.

These references identify disclosure topics; they do not determine Groam’s final legal position.
Qualified counsel should review the completed facts and the jurisdictions in which Groam will be
offered.
