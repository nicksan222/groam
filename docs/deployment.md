# Environments and deployment

Convex owns authentication, database, payments, scheduled jobs, and HTTP actions; the web app
keeps its realtime Convex subscriptions. Void publishes the app and Astro landing as separate
Cloudflare Workers, each at its own origin. The app remains client mounted; there is no `/app` prefix.

[`tooling/deploy/environments.json`](../tooling/deploy/environments.json) is the single source
of truth for each environment's public settings: Convex URL, Worker names, hostnames, the
account's workers.dev subdomain (where Void checks new versions, since preview URLs are off), and
an optional Cloudflare account. Void creates the Workers and custom domains from it, and the release
([`tooling/deploy`](../tooling/deploy/README.md)) sets Convex `SITE_URL` from it. GitHub holds secrets only.

| | Beta | Production |
| --- | --- | --- |
| Convex | Separate project | Production project |
| GitHub environment | `beta` | `prod` |
| Release order | First, on every main push | After beta deploys |
| Repository opt-in | `CONVEX_BETA_ENABLED=true` | `CONVEX_PRODUCTION_ENABLED=true` |

Beta uses its own Convex project's **production-scoped** deploy key; it never shares production
data or credentials. Feature branches never receive release credentials.

## One-time setup per environment

Run `just deploy setup` to see what each environment still needs. It checks the settings in
`environments.json`, the committed Void locks, and (through `gh`) the GitHub environment secrets
and the release switch. `just deploy preflight <environment>`, run by every release, also checks
the deploy key, the Convex variables, and the web Worker secrets. Variables and secrets are
defined once in
[`packages/env/src/deployment/variables.ts`](../packages/env/src/deployment/variables.ts), each
with how to get it.

| Where | What | How |
| --- | --- | --- |
| `tooling/deploy/environments.json` | `convexUrl` | Create the Convex project in the dashboard and copy its production deployment URL. |
| | `web.host`, `landing.host` | Hostnames in a Cloudflare zone you own; Void attaches them as custom domains. |
| | `workersSubdomain` | Cloudflare → Workers & Pages → your workers.dev subdomain (e.g. `my-team`); Void checks each new version there because preview URLs are off. |
| | `emailFrom` | Sender of authentication mail, e.g. `Groam <noreply@groam.app>`, on a domain in your Cloudflare account. |
| | `cloudflareAccountId` (optional) | Only when the Cloudflare token can reach several accounts. |
| GitHub environment (`beta`, `prod`) | `CONVEX_DEPLOY_KEY` | Convex dashboard → production deployment → Settings → generate a production deploy key. |
| | `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens, with the permissions below. |
| Cloudflare API token | Workers Scripts: Edit | Account permission: lets Void create and deploy the Workers. |
| | Workers Routes: Edit | Zone permission: lets Void attach the custom domains. |
| | Email Routing: Edit, Email Sending: Edit | Zone permissions: let Void set up authentication mail for the sender domain. |
| Convex environment | `AUTH_EMAIL_RELAY_SECRET` | A long random value (`openssl rand -base64 32`), set with `convex env set`. `SITE_URL` and `BETTER_AUTH_SECRET` are set by the release. |
| | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (optional) | Only for payments; set both or neither. Without both, every traveler gets a free pass. Point the Stripe webhook at `https://<deployment>.convex.site/payments/webhook`. |
| `apps/web` (Void) | `AUTH_EMAIL_RELAY_SECRET` | The same value as in Convex: `void secret put AUTH_EMAIL_RELAY_SECRET` in `apps/web`. |
| | `void email setup` | Needs a Workers Paid plan with Email Sending onboarded. Then run `void email setup --platform cloudflare` in `apps/web`; the sender comes from `emailFrom`. |
| `tooling/deploy/locks/<environment>/` | `web.void.lock.json`, `landing.void.lock.json` | Run the first `void deploy --platform cloudflare` in `apps/web` and `apps/landing` with `GROAM_ENVIRONMENT=<environment>`, then commit each `void.lock.json` here. |
| GitHub repository variable | `CONVEX_BETA_ENABLED`, `CONVEX_PRODUCTION_ENABLED` | Set to `true` once everything above is in place. Production only releases after the same revision deployed to beta, so beta must be on too. |

In short: create the Convex project and deploy key, a Cloudflare token, the GitHub environment with
its two secrets, the email relay secret in Convex and the web Worker plus `void email setup` (see
[authentication email](../packages/auth/README.md#hosted-authentication-and-email)), run the first
`void deploy` per app and commit the locks, then flip the release switch. Do not enable a
Cloudflare Git build; GitHub owns publishing.

## Releases

Every push to main is released automatically, beta first:

1. **Checks** run on the pushed revision.
2. **Preflight** (`just deploy preflight <environment>`) checks that beta and production have everything
   they need, reports every gap at once, and stops the run before any deploy.
3. **Deploy beta** publishes it to beta.
4. **Deploy production** publishes the same revision, only if beta deployed.

Actions → **Release main** reruns the whole pipeline for current main. A deploy refuses a revision
that is no longer the tip of main, so a newer push supersedes an older one. Direct local releases
are rejected.

The runner checks the trusted publisher, tested SHA, the preflight, and a clean checkout. It syncs
Convex `SITE_URL`, then deploys Convex followed by web and landing. Void builds and checks each version before it takes traffic. Frontend deploys get public
URLs and the Cloudflare token only; Convex gets only its deploy key.

The three publications are not atomic. A frontend failure after the Convex deploy leaves previous
frontend versions live; retry from current main. A changed Void lock fails the release.

## Rollback

Restore a prior Worker version in Cloudflare's deployment history. Roll Convex back by releasing a
reviewed backend revision through the same main flow.

Hosted ChatGPT connections remain disabled unless approved for hosted use. Privacy and terms still
need the owner/legal review in [landing readiness](./landing-launch-readiness.md).
