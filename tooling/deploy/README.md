# Application releases

`@groam/deploy` publishes the Convex backend and two Void/Cloudflare frontends. Everything a
release needs lives here:

```
src/
  environments.ts      Public settings per environment: the single source of truth
  release.ts           Entry point: verify, then publish Convex, web, and landing
  release/             Release target, trusted-publisher check, git checkout checks
  setup/               Everything an environment needs (requirements.ts) and `deploy:setup`
  convex/              Convex CLI wrapper, auth settings sync, backend deploy
  void/                Void lock handling, frontend build environment, frontend deploy
locks/<environment>/   Committed Void locks (web.void.lock.json, landing.void.lock.json)
```

`environments.ts` holds each environment's Convex URL, optional Cloudflare account, and the
Worker name and custom domain of each app. Both `void.config.ts` files import it through
`@groam/deploy/environments`, so Void creates the Workers and domains from the same values.

Run `bun run deploy:setup` to see what each environment still needs: config values, GitHub
secrets and variables, Cloudflare token permissions, Convex variables, and Void locks. Each entry
says where it lives and how to get it, and the command checks the ones it can.

Use `deploy:production` or `deploy:beta` from the repository root. Production accepts trusted
main pushes or manual releases; beta accepts only a manual release from main. Both require the
production-scoped deploy key of their own Convex project, the GitHub environment's secrets, an
immutable tested SHA, and a clean checkout.

Before deploying Convex, the release sets its `SITE_URL` to the web origin and generates
`BETTER_AUTH_SECRET` if the deployment has none. It never replaces or prints an existing secret.

Void hardcodes `void.lock.json` in each app directory. The release copies the committed lock there
for one deploy, rejects any change Void makes to it, and always removes it. Never copy a
production lock into beta.

Convex deploys first, followed by web and landing. Void builds and checks each version before
traffic moves. These deployments are not atomic; a later failure requires a deliberate retry.
Frontend deploys receive public URLs and the Cloudflare token only; Convex gets only its deploy key.

See [deployment setup and operation](../../docs/deployment.md).
