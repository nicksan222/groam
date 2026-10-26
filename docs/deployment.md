# Environments and deployment

Convex owns authentication, database, payments, scheduled jobs, HTTP actions, and realtime
subscriptions. One Vercel project serves the Astro landing page at `/` and the web SPA under
`/app/` on the same origin. The Vercel project `groam` exists in the
`nicksan222s-projects` team at `groam.vercel.app`.

[`tooling/deploy/environments.json`](../tooling/deploy/environments.json) owns the public Convex URL,
frontend hostname, Vercel team/project IDs, and mail sender. The release sets Convex `SITE_URL` to
`https://<host>/app`. API, payment webhook,
and ChatGPT callback URLs stay on the Convex `.convex.site` origin.

Production is the only hosted environment: the Convex production deployment, the GitHub
environment `prod`, released on every main push once the repository variable
`CONVEX_PRODUCTION_ENABLED=true` is set. Feature branches never receive release credentials.

## One-time setup

Run `just deploy setup` to see what production still needs. It checks the settings in
`environments.json`, and (through `gh`) the GitHub environment secrets
and the release switch. `just deploy preflight production`, run by every release, also checks
the deploy key, Convex variables, and access to the Vercel project. Variables and secrets are
defined once in
[`packages/env/src/deployment/variables.ts`](../packages/env/src/deployment/variables.ts), each
with how to get it.

| Where | What | How |
| --- | --- | --- |
| `tooling/deploy/environments.json` | `convexUrl` | Create the Convex project in the dashboard and copy its production deployment URL (currently `https://pastel-ocelot-555.eu-west-1.convex.cloud`). |
| | `host` | The `groam` project's verified production hostname, `groam.vercel.app`. GitHub builds and publishes both frontends to it. |
| | `vercelOrgId`, `vercelProjectId` | The IDs for the existing `groam` project in `nicksan222s-projects`; these public values are already configured. |
| | `emailFrom` | Sender of authentication mail, e.g. `Groam <noreply@groam.app>`, on a domain verified in Resend. |
| GitHub environment (`prod`) | `CONVEX_DEPLOY_KEY` | Convex dashboard → production deployment → Settings → generate a production deploy key. |
| GitHub environment (`prod`) | `VERCEL_TOKEN` | The `groam-github-production` token is scoped to the Groam project and stored as this environment secret. It expires on 26 October 2027; rotate it before then. Do not put tokens in committed files or frontend build variables. |
| Convex environment | `RESEND_API_KEY` (optional) | Only to actually send authentication mail: a Resend API key, set with `convex env set RESEND_API_KEY`. Never required: without it sign-up and sign-in work without email verification, mail is only logged (an error on hosted sites), and password reset and email change are unavailable; the preflight warns but does not fail. `SITE_URL`, `AUTH_EMAIL_FROM`, and `BETTER_AUTH_SECRET` are set by the release. |
| | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (optional) | Only for payments; set both or neither. Without both, every traveler gets a free pass. Keep the Stripe webhook at `https://<deployment>.convex.site/payments/webhook`; Vercel hosts no backend endpoints. |
| GitHub repository variable | `CONVEX_PRODUCTION_ENABLED` | Set to `true` once everything above is in place. |

Create the Convex project and the Vercel project, then configure the GitHub environment
with both secrets; optionally add a Resend key to Convex (see
[authentication email](../packages/auth/README.md#hosted-authentication-and-email)); then flip the
release switch. GitHub owns publishing.

## Attaching a custom domain later

Add the domain to the Vercel project, publish the DNS records Vercel provides, and wait for domain
verification. Update `host` and release through the normal workflow. Convex `SITE_URL`, landing
canonical URLs, and app links then follow that origin. API and webhook URLs stay on Convex.

The previous Convex frontend hosting required Convex Pro for custom domains. Moving the frontends
to Vercel removes that dependency; no Convex custom-domain binding is needed. A free delegated name
still needs approval from its registry and must support the DNS records Vercel requires.

## Releases

Every push to main is released automatically:

1. **Checks** run on the pushed revision.
2. **Preflight** (`just deploy preflight production`) checks that production has everything
   it needs, reports every gap at once, and stops the run before any deploy.
3. **Deploy production** publishes the same revision to Convex.

Actions → **Release main** reruns the whole pipeline for current main. A deploy refuses a revision
that is no longer the tip of main, so a newer push supersedes an older one. Direct local releases
are rejected.

The runner checks the trusted publisher, tested SHA, preflight, and clean checkout. It syncs
Convex `SITE_URL` and `AUTH_EMAIL_FROM`, deploys Convex, builds both frontends without release
credentials, then combines only their public build output and publishes it through Vercel's REST
API. The landing output resolves Astro directory pages and returns 404 for unknown paths; `/app`
redirects to `/app/`, whose assets are served before the SPA falls back to `/app/index.html`.
Smoke checks fetch both homepages, a localized landing page, an app deep link, and a hashed JS bundle.

The backend and frontend publications are not atomic. A frontend failure after the backend deploy
leaves the previous frontend live; retry from current main. Empty Vercel settings deliberately block preflight until
account setup is complete. Production deployment protection must allow public access, otherwise
smoke checks and demo access fail.

The existing Convex static-hosting components and previously uploaded assets remain during cutover;
new releases do not update them. Old frontend URLs may show an older version. Remove or redirect
legacy hosting in a separate cleanup after confirming the Vercel release works.

## Rollback

Roll back by releasing a reviewed revision through the same main flow: it redeploys Convex and
publishes both frontends together to Vercel. A failed upload leaves the previous frontend version live.

Hosted ChatGPT connections remain disabled unless approved for hosted use. Privacy and terms still
need the owner/legal review in [landing readiness](./landing-launch-readiness.md).
