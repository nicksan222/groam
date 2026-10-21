# Deployment

Owns the Convex backend and Cloudflare frontend release from build through publishing and public route checks. Backend HTTP
routing stays with the backend; release orchestration lives here.

Use the root `build:production`, `deploy:production`, and `smoke:production` scripts. Publishing is
restricted to the trusted main-branch GitHub Actions workflow. Both frontend builds run without a
deploy key, and a release manifest binds their contents to the tested commit and destination.

See [deployment setup and operation](../../docs/deployment.md) for the owner setup and release flow.

Cloudflare is the sole frontend host; no Convex static-hosting upload or serving
path remains. `main` is the canonical SaaS branch. Temporary `saas/**` review
branches run CI but cannot publish production. CI exercises the assembled Worker
and assets in Wrangler's local runtime without deployment credentials; production
smoke checks also verify the separate Convex authentication endpoint.
