# @groam/auth

Shared Better Auth client integration for Groam:

- `client.ts` creates the React client with the official Convex, organization, and cross-domain plugins.
- `browser-client.ts` provides the smaller framework-agnostic client.
- `provider.tsx` connects Better Auth to Convex React.

Apps import the client matching their framework. Both clients always target the Convex
HTTP-action origin paired with `VITE_CONVEX_URL` and use the official cross-domain session
transport. Server configuration stays beside the official local component in
`packages/backend/convex/modules/auth/auth.ts`; local deployment variables are initialized by
`tooling/devkit/configure-auth.ts --write-vite-site-url`.

## Hosted authentication and email

New users register with a real email address, a username, and a password. Hosted
sites require email verification before password sign-in; localhost retains the
provider-free development flow. Verification does not create a session automatically.
Existing passkey, authenticator, backup-code, and offline recovery-code flows remain.
Password-reset links expire according to Better Auth's default one-hour lifetime;
a successful reset consumes the token and revokes existing sessions.

The public auth screen includes password-reset requests and verification resends.
Both preserve the current frontend path under `/app`. Better Auth stores users,
sessions, passkeys and verification tokens in its Convex component. Better Auth
schedules an internal Convex action for each message, keeping delivery latency out
of account-existence responses.

That action hands the message to the Void Worker at the frontend origin
(`POST {SITE_URL}/api/email`, `apps/web/routes/api/email.ts`), which sends it with
`void/email`. Requests are signed (HMAC-SHA256 over a timestamp and the body) with a
secret Convex and the Worker share, and expire after five minutes; the Worker sends
nothing for unsigned, stale or malformed requests and never echoes provider details.
The signing helpers live in `packages/backend/convex/modules/auth/relay.ts`.

Configure before publishing a hosted signup flow:

- Convex: `SITE_URL` (the public frontend origin, also used for trusted origins and the
  passkey relying party) and `AUTH_EMAIL_RELAY_SECRET`.
- Void Worker: the same `AUTH_EMAIL_RELAY_SECRET`, set with `void secret put` from
  `apps/web` (declared in `apps/web/env.ts`, so `void deploy` refuses to publish without it).
- Sender: `AUTH_EMAIL_FROM` (GitHub variable), an address on your Cloudflare email
  domain. `void deploy --require-email` sets up Email Routing and Sending for it; run
  `void email setup --platform cloudflare` locally once and commit `apps/web/void.lock.json`.
  Sending to arbitrary recipients needs Workers Paid and Email Sending onboarding.

Locally, `tooling/devkit/configure-auth.ts` (run by `bun run dev`) writes one relay
secret to the Convex deployment and `apps/web/.env`, so mail Convex sends appears in
Void's dev inbox (its URL is printed when the web dev server starts). Missing relay
configuration does **not** bypass hosted verification: scheduled delivery fails and
users remain unverified. Inspect Convex scheduled-action failures and resend after
correcting configuration. Automatic retries are intentionally avoided so a slow
provider cannot send duplicate links.

Hosted password sign-in requires verified email ownership for both email and
username identifiers. Better Auth owns the `emailVerified` state; signup cannot
choose it. Addresses under `users.invalid` are rejected because they cannot
receive verification mail. Password-reset links use both `token` and
`auth=reset-password` to open the recovery screen, including for signed-in users.
