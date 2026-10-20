# Production deployment

Groam runs its full backend on Convex and publishes both frontends together to Cloudflare Workers
Static Assets. One public origin serves the landing pages at `/` and the application at `/app/`.
Convex owns authentication, database, payments, scheduled jobs, and HTTP actions. The Cloudflare
Worker only serves static files and handles application deep links and localized landing 404s.

Production releases remain disabled until the owner configures the accounts and GitHub environment.
CI never creates Convex projects or changes backend secrets.

## One-time setup

1. Create a production Convex deployment. Set its `BETTER_AUTH_SECRET` and set its `SITE_URL` to
   the public **Cloudflare frontend origin**, for example `https://groam.example`. This must match
   the frontend origin used for authentication and passkeys. Configure the authentication email
   sender (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_EMAIL_API_TOKEN`, `AUTH_EMAIL_FROM`) and other backend secrets before enabling
   production signups. Cloudflare Email Sending is a separate service from static hosting;
   configuring Workers hosting alone does not enable outbound email.
2. Create a Cloudflare account and reserve a Worker name, for example `groam`. The deployment
   publishes the Worker with its static assets in one operation. Attach your custom domain to that
   Worker in the Cloudflare dashboard before enabling production, or use its assigned `workers.dev`
   origin. Domain/DNS setup stays outside CI. Do not enable a second automatic Cloudflare Git build:
   the trusted GitHub release workflow owns publishing.
3. Use the existing protected GitHub environment `prod` in `nicksan222/groam`. Restrict its deployment
   branch policy to `main`. Store `CONVEX_DEPLOY_KEY` (a production-scoped key) and
   `CLOUDFLARE_API_TOKEN` as **environment secrets**. Scope the Cloudflare token to this account with
   Workers Scripts Edit permission. No credentials belong in repository variables or frontend builds.
4. Add public environment or repository variables:

   | Variable | Value |
   | --- | --- |
   | `CONVEX_URL` | Production API origin, e.g. `https://deployment.convex.cloud` |
   | `SITE_URL` | Public Cloudflare frontend origin, e.g. `https://groam.example` |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account's 32-character ID |
   | `CLOUDFLARE_WORKER_NAME` | Selected Worker name, e.g. `groam` |

   HTTPS origins must have no paths, credentials, queries, or fragments. Regional Convex API URLs
   retain their region. The matching Convex HTTP origin is derived from `CONVEX_URL`; it is used for
   auth HTTP requests and must remain reachable.
5. Finally set **repository** variable `CONVEX_PRODUCTION_ENABLED` to exactly `true`. The caller
   checks this variable before attaching the protected environment. Leave it unset until setup is
   complete. No key is needed to run PR CI. Stripe itself is optional; absent Stripe configuration
   leaves the application in its documented payments-skipped mode.

## Trusted release flow

A push to `main` runs all Checks before Release Production. The manual Deploy Production workflow
also reruns Checks and accepts only `main`. Pull requests targeting `main` or any `saas/**` branch
run Checks, so every layer in a PR stack receives CI without production credentials.

The release checks out the tested immutable SHA and installs the lockfile. Frontend builds receive
only public destinations; neither deployment secret is present during build. The build assembles
landing files and `/app/` files into `dist/cloudflare/assets`, copies the static routing Worker,
and generates the Wrangler configuration. A release manifest hashes the original builds and the
assembled Cloudflare release and binds them to this commit, account, Worker name, and destinations.
Publishing rejects changes to source or output after verification. Before the first mutation, a
`convex env list --names-only` preflight confirms production authentication/email variables exist
without retrieving or printing their values. It cannot prove that the provider accepts the token
or that the sender domain is verified; complete that setup before enabling releases.

Immediately before publishing, CI verifies that the SHA is still the remote `main` tip. Releases
share a non-canceling concurrency group. The publication step deploys Convex first, then uploads
one atomic Cloudflare frontend release. Each child CLI receives only its own deployment credential.
A Cloudflare failure after Convex deploy leaves the previous frontend intact; fix the failure and
rerun from current main. Backend and frontend publication are not a cross-provider transaction,
so backend changes must remain compatible with the prior frontend during this interval.

The smoke check uses public GET requests without secrets. It checks the English and Italian landing
pages, `/app/`, application deep links and JavaScript assets, the Convex auth endpoint, and missing
routes/assets that must return 404. Deployment/credential setup cannot be verified from PR CI.
The deployment workspace also tests the edge router, release integrity, destination validation,
credential isolation, and smoke failures without accessing production.

## Operation and rollback

Merge the reviewed stack sequentially into main and watch CI's Deploy production job. For retries,
run Actions → Deploy Production on main. A skipped release usually means the explicit production
opt-in is absent. Invalid configuration, missing credentials, or an outdated SHA fail closed.

For an urgent frontend rollback, use Cloudflare's deployment history to restore a prior Worker
version and its assets. Convex rollback is separate: deploy a reviewed compatible backend revision
through the normal release process. Do not weaken the trusted main or manifest checks to force a
stale artifact into production.

Hosted ChatGPT account connections remain disabled unless approved for hosted use. Privacy/terms
pages still need the owner/legal review listed in [landing readiness](./landing-launch-readiness.md).

Cloudflare references: [Static Assets bindings](https://developers.cloudflare.com/workers/static-assets/binding/),
[Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), and
[GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).
