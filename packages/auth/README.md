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
Both preserve the current frontend path, including `/app/` deployments. Better Auth
stores users, sessions, passkeys and verification tokens in its Convex component.
Email delivery runs as an internal scheduled Convex action, keeping external-provider
latency out of account-existence responses. No separate application backend or
email Worker is used.

Configure these **Convex deployment** environment variables before publishing a
hosted signup flow:

- `SITE_URL`: the public frontend origin used for trusted origins and the passkey relying party.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account with Email Sending access.
- `CLOUDFLARE_EMAIL_API_TOKEN`: a narrowly scoped token with Email Sending permission.
- `AUTH_EMAIL_FROM`: an address on the verified Cloudflare sending domain.

These are backend values; never expose the email token through Vite or Worker assets.
Enable Cloudflare Email Sending and complete its domain authentication first. Email
Routing alone is insufficient. Cloudflare's [outbound REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/)
is called directly from Convex. Cloudflare may require beta access/entitlement;
confirm delivery with a real mailbox before launch. Missing sender credentials do
**not** bypass hosted verification: scheduled delivery fails and users remain
unverified. Inspect Convex scheduled-action failures and resend after correcting
configuration. Automatic retries are intentionally avoided because this send API
has no documented idempotency key.

### Existing accounts

Old placeholder email addresses cannot receive verification or recovery messages.
Settings → Profile → Account email lets signed-in users verify a real replacement
address. The previous address remains until the new inbox is verified, including
for placeholder addresses. Better Auth requires a fresh session for this change.
Pre-rollout placeholder accounts have no `emailVerificationRequired` marker and retain
password sign-in so they can migrate without an existing session or passkey. New
accounts receive the readonly marker from the server's create hook; public signup
and email-change requests cannot choose it. New `@users.invalid` addresses are
rejected. All other hosted accounts still require verification. Once a legacy
account verifies a real address, its normal verified-email flow applies.

Change-email links open the frontend and verify through its authenticated client.
The signed token must match a fresh session for the original account; an anonymous
recipient or a different account cannot consume the link or gain a session.
Existing registered passkeys continue to authenticate on their original
relying-party domain; changing that domain requires registering new passkeys.

The rollout marker is an optional additive schema field and requires no backfill.
Older code can read existing records, but rolling the deployment back also removes
the new signup verification policy; prefer a forward fix. Retain the field during
any rollback, and never clear a newly created user's marker to simulate legacy data.
