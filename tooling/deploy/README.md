# Application releases

`@groam/deploy` publishes the Convex backend and two Void/Cloudflare frontends with plain shell
recipes in [`justfile`](./justfile), mounted in the root Justfile as `just deploy`:

```
justfile               setup, preflight <environment>, release <environment>
environments.json      Public settings per environment: the single source of truth
environments.schema.json  Its JSON schema (editor validation; tooling/quality/release tests enforce it)
locks/<environment>/   Committed Void locks (web.void.lock.json, landing.void.lock.json)
```

`environments.json` holds each environment's Convex URL, optional Cloudflare account, mail sender,
workers.dev subdomain (Void's readiness checks use it because version preview URLs are off), and
the Worker name and custom domain of each app. Both `void.config.ts` files import it through
`@groam/deploy/environments`, so Void creates the Workers and domains from the same values.
[`environments.schema.json`](./environments.schema.json) types every field, and
`tooling/quality/release/environments.test.ts` validates the file against it in CI.

`just deploy setup` shows what each environment still needs and can see from your machine
(settings, Void locks, GitHub secrets, release switch). `just deploy preflight <environment>`
checks one environment completely, reporting every gap at once: settings, GitHub secrets, the
deploy key, Convex variables, Void locks, and web Worker secrets. Required variable names come
from [`@groam/env/deployment`](../../packages/env/src/deployment/variables.ts).

Every main push runs `just deploy release beta`, then `just deploy release production`
(`.github/workflows/release.yml`). A release accepts only the trusted main-branch workflow (a push
or the manual **Release main**), runs the preflight, and requires the tested SHA and a clean
checkout.

Before deploying Convex, the release sets its `SITE_URL` to the web origin and generates
`BETTER_AUTH_SECRET` if the deployment has none. It never replaces or prints an existing secret,
and the preflight refuses to run without `AUTH_EMAIL_RELAY_SECRET`. The web app deploys with
`--require-email`.

Void hardcodes `void.lock.json` in each app directory. The release copies the committed lock there
for one deploy, rejects any change Void makes to it, and always removes it. Never copy a
production lock into beta.

Convex deploys first, followed by web and landing. Void builds and checks each version before
traffic moves. These deployments are not atomic; a later failure requires a deliberate retry.
Convex commands run without the Cloudflare token; Void deploys run without the Convex deploy key
and receive public URLs only.

See [deployment setup and operation](../../docs/deployment.md).
