# Landing legal launch readiness

The privacy and terms pages are intentionally marked **Draft**. They describe confirmed product
behavior where the repository provides evidence, but they are not a substitute for owner decisions
and legal review. Do not remove the draft label or use these pages as sign-up acceptance terms until
the blockers below are resolved.

## Confirmed product behavior

- Authentication is handled in Groam with email and password plus optional passkeys and two-step
  verification. Session records can include an IP address and user agent. Evidence:
  `packages/backend/convex/modules/auth/auth.ts` and
  `packages/backend/convex/components/better-auth/generated.ts`.
- A trip is visible to signed-in members of its organization. Trip RSVP status does not narrow that
  access. Evidence: `packages/backend/convex/modules/travel/trips/visibility.ts` and
  `packages/backend/convex/modules/travel/travelers/index.ts`.
- AI uses the selected user’s ChatGPT grant. Groam sends requests to OpenAI’s Responses API and sets
  `store: false`; Groam separately stores conversations, agent runs, and trip activity needed by the
  product. Evidence: `packages/backend/ai/chatgpt/provider.ts`,
  `packages/backend/convex/modules/ai/chatgpt/storage.ts`, and the assistant/discussion schemas.
- Uploaded covers and conversation media use Convex storage. Some replacement/removal paths delete
  unreferenced files, but there is no product-wide retention schedule. Evidence:
  `packages/backend/convex/modules/travel/covers/index.ts` and
  `packages/backend/convex/modules/discussions/media/index.ts`.
- No payment processor or paid-invite implementation was found. The landing pricing copy explicitly
  says paid invites are not live yet.
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
8. **Payments:** payment processor, merchant of record, charge trigger, taxes, receipts, failed
   payments, cancellation, refunds, statutory withdrawal rights, and the exact responsibility split
   between inviter and traveler.
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
