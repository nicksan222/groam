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

Hosted sites require a verified email before password sign-in; localhost skips it. Convex
schedules each message (`packages/backend/convex/modules/auth/email.ts`, rate-limited per
recipient) and hands it to the Void Worker at `apps/web/routes/api/email.ts`, signed as in
`packages/backend/convex/modules/auth/relay.ts`.

Setup for a hosted environment:

1. Set Convex `SITE_URL` (the frontend origin) and `AUTH_EMAIL_RELAY_SECRET`.
2. Set the same secret on the Worker: `void secret put AUTH_EMAIL_RELAY_SECRET` in `apps/web`.
3. Set `emailFrom` in `tooling/deploy/src/environments.ts`, then run
   `void email setup --platform cloudflare` in `apps/web`.

A missing or mismatched relay secret does **not** skip verification: delivery fails and users
stay unverified. Accounts created before email sign-in hold placeholder `@users.invalid`
addresses and cannot use password sign-in on hosted deployments.

Locally, `just dev` writes one relay secret to Convex and `apps/web/.env`; mail appears in
Void's dev inbox. After pulling this change, run `just dev` once so `apps/web/.env` gets it.
