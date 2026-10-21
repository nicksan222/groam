# Environments and deployment

Convex owns authentication, database, payments, scheduled jobs, and HTTP actions; the web app
keeps its realtime Convex subscriptions. Void publishes the app and Astro landing as separate
Cloudflare Workers, each at its own origin. The app remains client mounted; there is no `/app` prefix.

[`tooling/deploy/src/environments.ts`](../tooling/deploy/src/environments.ts) is the single source
of truth for each environment's public settings: Convex URL, Worker names, hostnames, the
account's workers.dev subdomain (where Void checks new versions, since preview URLs are off), and
an optional Cloudflare account. Void creates the Workers and custom domains from it, and the release
([`tooling/deploy`](../tooling/deploy/README.md)) sets Convex `SITE_URL` from it. GitHub holds secrets only.

| | Beta | Production |
| --- | --- | --- |
| Convex | Separate project | Production project |
| GitHub environment | `beta` | `prod` |
| Release order | First, on every main push | After beta deploys and passes end-to-end checks |
| Repository opt-in | `CONVEX_BETA_ENABLED=true` | `CONVEX_PRODUCTION_ENABLED=true` |

Beta uses its own Convex project's **production-scoped** deploy key; it never shares production
data or credentials. Feature branches never receive release credentials.

## One-time setup per environment

Everything an environment needs lives in one list,
[`tooling/deploy/src/setup/requirements.ts`](../tooling/deploy/src/setup/requirements.ts); its
variables and secrets are defined once in
[`packages/env/src/deployment/variables.ts`](../packages/env/src/deployment/variables.ts). Run:

```sh
bun run deploy:setup
```

It prints, for each environment, every value grouped by where it lives (`environments.ts`, GitHub
environment secrets, the Cloudflare token, Convex, committed Void locks, the release switch), how to
get it, and whether it is done. It checks the config, the GitHub secrets and variables (through
`gh`), and the committed locks; the release preflight also checks Convex and the web Worker.
Releases also read this list, so a value can't be required without appearing in it.

In short: create the Convex project and deploy key, a Cloudflare token, the GitHub environment with
its two secrets, the email relay secret in Convex and the web Worker plus `void email setup` (see
[authentication email](../packages/auth/README.md#hosted-authentication-and-email)), run the first
`void deploy` per app and commit the locks, then flip the release switch. Do not enable a
Cloudflare Git build; GitHub owns publishing.

## Releases

Every push to main is released automatically, beta first:

1. **Checks** run on the pushed revision.
2. **Preflight** (`bun run deploy:preflight`) checks that beta and production have everything
   they need, reports every gap at once, and stops the run before any deploy.
3. **Deploy beta** publishes it to beta.
4. **End-to-end on beta** (`bun run test:deployed`) drives the live beta in a real browser as a
   signed-out visitor: the sign-in screen and its legal links, deep links, static files and 404s,
   the Convex auth backend, and the landing pages.
5. **Deploy production** publishes the same revision, only if both beta steps passed.

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
