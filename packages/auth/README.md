# @groam/auth

Shared Better Auth client integration for Groam:

- `client.ts` creates the React client with the official Convex, organization, and cross-domain plugins.
- `browser-client.ts` provides the smaller framework-agnostic client.
- `provider.tsx` connects Better Auth to Convex React.

Apps import the client matching their framework. Both clients always target the Convex
HTTP-action origin paired with `VITE_CONVEX_URL` and use the official cross-domain session
transport. Server configuration stays beside the official local component in
`packages/backend/convex/modules/auth/auth.ts`; local deployment variables are initialized by
`just configure-local-auth --write-vite-site-url` (run by `just start-convex`).

## Hosted authentication and email

Hosted sites with a Resend key require a verified email before password sign-in; localhost, and hosted sites without a key, skip it. Convex
schedules each message (`packages/backend/convex/modules/auth/email.ts`, rate-limited per
recipient) and either queues it on the official Resend Convex component (`@convex-dev/resend`:
batching, retries, idempotency) or, when no key is set, logs it.

Resend is optional, like Stripe:

- With `RESEND_API_KEY` set (`convex env set RESEND_API_KEY ...`), mail is queued for real
  recipients (`testMode: false`) from `AUTH_EMAIL_FROM`, which every release sets from `emailFrom`
  in `tooling/deploy/environments.json`. Without `AUTH_EMAIL_FROM` the sender is
  `Groam <onboarding@resend.dev>`; verify your sending domain in Resend before using your own. That default sender only
  delivers to the Resend account owner's own address, so real use needs `AUTH_EMAIL_FROM` on a
  verified domain.
- Without `RESEND_API_KEY`, nothing is sent. On a local site the recipient, subject, and text (with
  its links) go to the Convex function log, so development reads verification and reset links there
  (`just dashboard`, or the `convex dev` terminal). On a hosted site only an error naming the
  recipient domain and subject is logged, never the text or its links.
- A daily cron (`crons.ts`) deletes delivered emails older than a week from the component.

A hosted deployment without a key is fully usable: sign-up and sign-in do not require verification,
since nobody could receive the link (`canSendEmail` in `modules/auth/verification.ts` decides).
Password reset, the verification resend, and email change are unavailable there: Better Auth
refuses them with a 503, `api.routes.auth.email` reports the capability, and the web app hides the
reset/verification request and explains in Settings. Setting a key later makes verification required
again for new sign-ins. Accounts created before email sign-in hold placeholder `@users.invalid`
addresses and cannot use password sign-in on hosted deployments. Errors from delivery never include
the key or the message.

## Changing an account email

Settings → Profile → Account email verifies a replacement address before it takes effect. Links
return to the frontend as `emailChangeToken` and are confirmed by the signed-in original account,
whose session must be newer than Better Auth's `freshAge` (24h); the old address gets a notice.
Accounts with placeholder `@users.invalid` addresses recover by changing to a real address while
signed in with a fresh session (or a passkey). Policy: `packages/backend/convex/modules/auth/verification.ts`.
