# Application releases

`@groam/deploy` publishes the Convex backend, then the landing site and web app to one Vercel
project. Recipes in [justfile](./justfile) are mounted as `just deploy` at the repository root.

- `environments.json` holds public production destinations, Vercel IDs, and the mail sender.
- `environments.schema.json` validates that configuration; empty values mark unfinished setup.
- `prepare-vercel.ts` packages both built `dist` directories as one Vercel Build Output API v3
  artifact: landing at `/` and the SPA under `/app/`.

`just deploy setup` reports missing settings, GitHub secrets, and the release switch. Preflight
also validates the Convex production key and Vercel access to the project. Required secret names
come from [`@groam/env/deployment`](../../packages/env/src/deployment/variables.ts).

Only the trusted, tested, current main GitHub workflow can release. It sets Convex `SITE_URL` to
`https://<host>/app` and `AUTH_EMAIL_FROM` to `emailFrom`, generating `BETTER_AUTH_SECRET` only when
absent. Authentication email remains optional. Builds run without Convex and Vercel credentials.

The landing site is built at `/` and the web app at `/app/`. Landing directory pages have explicit
routes and unknown pages return its 404; web assets are served before the SPA fallback. The REST
publisher uploads the prepared artifact and assigns the production domains. Do not connect the
project to Vercel Git auto-deployments: GitHub owns the release gate and embeds the configured
production destinations at build time.

The Convex backend and combined Vercel frontend publish sequentially and are not atomic. Smoke checks cover homepages,
localization, app deep links, and a JavaScript asset. Retry from current main if publishing fails.
Existing Convex static frontend assets remain available during cutover, but no longer receive uploads.

See [deployment setup and operation](../../docs/deployment.md).
