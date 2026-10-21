# Application releases

`@groam/deploy` publishes the Convex backend and two Void/Cloudflare frontends. Everything a
release needs lives here:

```
src/
  environments.ts      Public settings per environment: the single source of truth
  release.ts           Entry point: verify, then publish Convex, web, and landing
  release/             Release target, trusted-publisher check, git checkout checks
  setup/               Setup checklist (`deploy:setup`) and release preflight (`deploy:preflight`)
e2e/                   Live checks against a deployed environment (`test:deployed`)
  convex/              Convex CLI wrapper, auth settings sync, backend deploy
  void/                Void lock handling, frontend build environment, frontend deploy
locks/<environment>/   Committed Void locks (web.void.lock.json, landing.void.lock.json)
```

`environments.ts` holds each environment's Convex URL, optional Cloudflare account, mail sender,
workers.dev subdomain (Void's readiness checks use it because version preview URLs are off), and
the Worker name and custom domain of each app. Both `void.config.ts` files import it through
`@groam/deploy/environments`, so Void creates the Workers and domains from the same values.

`bun run deploy:preflight` checks one environment is ready (CI and every release run it first), and
`bun run deploy:setup` shows what each environment still needs: config values, GitHub
secrets and variables, Cloudflare token permissions, Convex variables, and Void locks. Each entry
says where it lives and how to get it, and the command checks the ones it can.

Every main push runs `deploy:beta`, then `test:deployed` (the live checks in `e2e/`, run against
beta in a real browser), then `deploy:production` (`.github/workflows/release.yml`). Both deploys
accept only the trusted main-branch workflow (a push or the manual **Release main**), and each
requires its own Convex project's production-scoped deploy key, the GitHub environment's
secrets, an immutable tested SHA, and a clean checkout.

Before deploying Convex, the release sets its `SITE_URL` to the web origin and generates
`BETTER_AUTH_SECRET` if the deployment has none. It never replaces or prints an existing secret,
and it refuses to run without `AUTH_EMAIL_RELAY_SECRET`. The web app deploys with `--require-email`.

Void hardcodes `void.lock.json` in each app directory. The release copies the committed lock there
for one deploy, rejects any change Void makes to it, and always removes it. Never copy a
production lock into beta.

Convex deploys first, followed by web and landing. Void builds and checks each version before
traffic moves. These deployments are not atomic; a later failure requires a deliberate retry.
Frontend deploys receive public URLs and the Cloudflare token only; Convex gets only its deploy key.

See [deployment setup and operation](../../docs/deployment.md).
