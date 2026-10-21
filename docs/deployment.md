# Environments and deployment

Convex owns authentication, database, payments, scheduled jobs, and HTTP actions; the web app
keeps its realtime Convex subscriptions. Void publishes the app and Astro landing as separate
Cloudflare Workers, each at its own origin. The app remains client mounted; there is no `/app` prefix.

[`tooling/deploy/src/environments.ts`](../tooling/deploy/src/environments.ts) is the single source
of truth for each environment's public settings: Convex URL, Worker names, hostnames, and an
optional Cloudflare account. Void creates the Workers and custom domains from it, and the release
([`tooling/deploy`](../tooling/deploy/README.md)) sets Convex `SITE_URL` from it. GitHub holds secrets only.

| | Beta | Production |
| --- | --- | --- |
| Convex | Separate project | Production project |
| GitHub environment | `beta` | `prod` |
| Release trigger | Manual from main | Main push or manual from main |
| Repository opt-in | `CONVEX_BETA_ENABLED=true` | `CONVEX_PRODUCTION_ENABLED=true` |

Beta uses its own Convex project's **production-scoped** deploy key; it never shares production
data or credentials. Feature branches never receive release credentials.

## One-time setup per environment

1. **Convex:** create the project in the dashboard, copy its production URL into that environment's `convexUrl`, and
   create a production deploy key. The first release sets `SITE_URL` and generates `BETTER_AUTH_SECRET`.
   Other backend secrets (AI, email, payments) are set with `convex env set`. If
   `STRIPE_SECRET_KEY` is set, `STRIPE_WEBHOOK_SECRET` must be too.
2. **Cloudflare:** add the zone for the hostnames and create an API token with *Workers Scripts:
   Edit* and *Workers Routes: Edit* (custom domains). Set `cloudflareAccountId` only if the token
   reaches several accounts.
3. **GitHub:** create the `prod`/`beta` environment limited to `main`, with secrets
   `CONVEX_DEPLOY_KEY` and `CLOUDFLARE_API_TOKEN`.
4. **Void locks:** run the first `void deploy --platform cloudflare` locally in `apps/web` and
   `apps/landing` with `GROAM_ENVIRONMENT` set, then commit each `void.lock.json` as
   `tooling/deploy/locks/<environment>/{web,landing}.void.lock.json`.
5. Set the repository opt-in variable. Do not enable a Cloudflare Git build; GitHub owns publishing.

## Releases

A push to main runs Checks, then Release Production. Actions → Deploy Production or Deploy Beta
reruns Checks and publishes main only. Direct local releases are rejected.

The runner checks the trusted publisher, tested SHA, clean checkout, committed Void locks, matching
Convex key, and Cloudflare token. It syncs Convex `SITE_URL`, then deploys Convex followed by web and
landing. Void builds and checks each version before it takes traffic. Frontend deploys get public
URLs and the Cloudflare token only; Convex gets only its deploy key.

The three publications are not atomic. A frontend failure after the Convex deploy leaves previous
frontend versions live; retry from current main. A changed Void lock fails the release.

## Rollback

Restore a prior Worker version in Cloudflare's deployment history. Roll Convex back by releasing a
reviewed backend revision through the same main flow.

Hosted ChatGPT connections remain disabled unless approved for hosted use. Privacy and terms still
need the owner/legal review in [landing readiness](./landing-launch-readiness.md).
