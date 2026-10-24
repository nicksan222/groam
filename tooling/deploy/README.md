# Application releases

`@groam/deploy` publishes the Convex backend and uploads both frontends to Convex static hosting
(`@convex-dev/static-hosting`) with plain shell recipes in [`justfile`](./justfile), mounted in the root Justfile as `just deploy`:

```
justfile               setup, preflight production, release production
environments.json      Public settings for production: the single source of truth
environments.schema.json  Its JSON schema (editor validation; tooling/quality/release tests enforce it)
```

`environments.json` holds the production Convex URL, the optional custom `host` that serves both
frontends (landing at `/`, web app at `/app/`), and the mail sender. While `host` is empty, both are
served from the deployment's own HTTP origin, the Convex URL with `.convex.cloud` replaced by
`.convex.site`. The intended domain is `groam.app`; attaching it later only needs `host` set (see
"Attaching a custom domain later" in the deployment guide).
[`environments.schema.json`](./environments.schema.json) types every field, and
`tooling/quality/release/environments.test.ts` validates the file against it in CI.

`just deploy setup` shows what production still needs and can see from your machine
(settings, GitHub secrets, release switch). `just deploy preflight production`
checks production completely, reporting every gap at once: settings, GitHub secrets, the
deploy key, and Convex variables. Required variable names come
from [`@groam/env/deployment`](../../packages/env/src/deployment/variables.ts).

Every main push runs the preflight and then `just deploy release production`
(`.github/workflows/release.yml`), which deploys the latest main to Convex. A release accepts only the trusted main-branch workflow (a push
or the manual **Release main**), runs the preflight, and requires the tested SHA and a clean
checkout.

Before deploying Convex, the release sets its `SITE_URL` to `https://<host or deployment origin>/app` and `AUTH_EMAIL_FROM` to
`emailFrom`, and generates `BETTER_AUTH_SECRET` if the deployment has none. It never replaces or
prints an existing secret. `RESEND_API_KEY` is optional and set by hand; without it, auth mail is
logged by Convex instead of sent, hosted sign-up needs no email verification, and password reset
and email change are unavailable.

Each frontend is built with public URLs (the web build also gets `STATIC_HOSTING_BASE_PATH=/app/`),
then `static-hosting upload --prod --component <landing|web>` publishes its `dist` into that
component instance. The landing site uploads with `--no-spa` (unknown URLs answer 404 with its
`404.html`); the web app falls back to `index.html` for client routes. Routing lives in
`packages/backend/convex/http.ts` and `modules/hosting/site.ts`.

Convex deploys first, followed by landing and web. These deployments are not atomic; a later failure requires a deliberate retry.
Builds run without the Convex deploy key and receive public URLs only.

See [deployment setup and operation](../../docs/deployment.md).
