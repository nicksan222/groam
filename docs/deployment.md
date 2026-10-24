# Environments and deployment

Convex owns authentication, database, payments, scheduled jobs, and HTTP actions; the web app
keeps its realtime Convex subscriptions. Both frontends are served by the same Convex deployment through the
[`@convex-dev/static-hosting`](https://www.npmjs.com/package/@convex-dev/static-hosting) component, from one origin:
the Astro landing site at `/` and the static web SPA under `/app/`. Until a custom domain is attached, that origin is
the deployment's own HTTP address (`https://<deployment>.convex.site`); the intended domain is `groam.app`. The auth, payment-webhook and ChatGPT
callback routes keep their URLs (see [http.ts](../packages/backend/convex/http.ts)).

[`tooling/deploy/environments.json`](../tooling/deploy/environments.json) is the single source
of truth for each environment's public settings: Convex URL, the optional custom domain, and the
mail sender. The release ([`tooling/deploy`](../tooling/deploy/README.md)) sets Convex `SITE_URL` (`https://<host>/app`,
or `https://<deployment>.convex.site/app` while `host` is empty) from it. GitHub holds secrets only.

Production is the only hosted environment: the Convex production deployment, the GitHub
environment `prod`, released on every main push once the repository variable
`CONVEX_PRODUCTION_ENABLED=true` is set. Feature branches never receive release credentials.

## One-time setup

Run `just deploy setup` to see what production still needs. It checks the settings in
`environments.json`, and (through `gh`) the GitHub environment secrets
and the release switch. `just deploy preflight production`, run by every release, also checks
the deploy key, and the Convex variables. Variables and secrets are
defined once in
[`packages/env/src/deployment/variables.ts`](../packages/env/src/deployment/variables.ts), each
with how to get it.

| Where | What | How |
| --- | --- | --- |
| `tooling/deploy/environments.json` | `convexUrl` | Create the Convex project in the dashboard and copy its production deployment URL (currently `https://pastel-ocelot-555.eu-west-1.convex.cloud`). |
| | `host` (optional) | Leave empty to serve from the deployment's own origin, `https://<deployment>.convex.site` (the `convexUrl` with `.convex.cloud` replaced by `.convex.site`): the app is then `https://<deployment>.convex.site/app`. To use a custom domain (intended: `groam.app`), attach it to the Convex deployment in the dashboard (Settings → Custom domains), add the DNS records Convex lists, then set `host` to it; a `*.convex.site` address is rejected as `host` because empty already means that. Attach the domain before setting `host`: the smoke checks then fetch `https://<host>/`, and `just deploy preflight` warns while it is unreachable. |
| | `emailFrom` | Sender of authentication mail, e.g. `Groam <noreply@groam.app>`, on a domain verified in Resend. |
| GitHub environment (`prod`) | `CONVEX_DEPLOY_KEY` | Convex dashboard → production deployment → Settings → generate a production deploy key. |
| Convex environment | `RESEND_API_KEY` (optional) | Only to actually send authentication mail: a Resend API key, set with `convex env set RESEND_API_KEY`. Without it, mail is written to the Convex function log and users cannot receive verification email; the preflight warns but does not fail. `SITE_URL`, `AUTH_EMAIL_FROM`, and `BETTER_AUTH_SECRET` are set by the release. |
| | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (optional) | Only for payments; set both or neither. Without both, every traveler gets a free pass. Point the Stripe webhook at `https://<host>/payments/webhook` (or `https://<deployment>.convex.site/payments/webhook` while `host` is empty); the route is unchanged by static hosting. |
| GitHub repository variable | `CONVEX_PRODUCTION_ENABLED` | Set to `true` once everything above is in place. |

In short: create the Convex project, its deploy key (and later a custom domain), and the GitHub environment
with its secret; optionally add a Resend key to Convex (see
[authentication email](../packages/auth/README.md#hosted-authentication-and-email)); then flip the
release switch. GitHub owns publishing.

## Attaching a custom domain later

1. In the Convex dashboard (production deployment → Settings → Custom domains), add `groam.app` and create the DNS records Convex lists.
2. Wait until `https://groam.app/` answers.
3. Set `host` to `groam.app` in `tooling/deploy/environments.json` and merge. The next release moves `SITE_URL` to `https://groam.app/app`, builds both frontends against it, and smoke-checks that origin.
4. Update any external callbacks that used the `.convex.site` address (Stripe webhook).

## Releases

Every push to main is released automatically:

1. **Checks** run on the pushed revision.
2. **Preflight** (`just deploy preflight production`) checks that production has everything
   it needs, reports every gap at once, and stops the run before any deploy.
3. **Deploy production** publishes the same revision to Convex.

Actions → **Release main** reruns the whole pipeline for current main. A deploy refuses a revision
that is no longer the tip of main, so a newer push supersedes an older one. Direct local releases
are rejected.

The runner checks the trusted publisher, tested SHA, the preflight, and a clean checkout. It syncs
Convex `SITE_URL` and `AUTH_EMAIL_FROM`, then deploys Convex, then builds the landing site and the web app and
uploads each with the static-hosting CLI (`--component landing --no-spa`, `--component web`, which falls back to
`index.html` for client routes). Frontend builds get public URLs only; only the upload steps see the deploy key.

The three publications are not atomic. A frontend failure after the Convex deploy leaves previous
frontend versions live; retry from current main.

## Rollback

Roll back by releasing a reviewed revision through the same main flow: it redeploys Convex and
re-uploads both frontends. A failed upload leaves the previous frontend live.

Hosted ChatGPT connections remain disabled unless approved for hosted use. Privacy and terms still
need the owner/legal review in [landing readiness](./landing-launch-readiness.md).
