# Production deployment

Groam deploys one production Convex backend and two static components from the trusted `main`
branch. The landing site is served at the root production URL, the web app is served below `/app/`,
and authentication callbacks remain on the root Convex HTTP origin.

Production releases are deliberately disabled until the repository owner completes the setup below.
CI does not create Convex projects, deployments, environment variables, GitHub environments, or
secrets.

## One-time owner setup

1. Create the production Convex project and deployment outside GitHub Actions.
2. In the Convex production dashboard, set `BETTER_AUTH_SECRET` to a strong random secret and set
   `SITE_URL` to the public site origin, such as `https://example.convex.site`. Keep it as an origin:
   use HTTPS, omit a path, query, fragment, and trailing slash. CI intentionally does not
   read or write Convex environment variables.
3. Reuse the existing GitHub environment named `prod` in `nicksan222/groam`. Its deployment branch
   policy must allow only the selected branch `main`; do not allow tags or every branch. Add the
   production Convex deploy key as its `CONVEX_DEPLOY_KEY` secret. Do not add a personal Convex
   access token or create a new, initially unprotected environment.
4. Add these public variables to the `prod` environment or as GitHub repository variables:

   - `CONVEX_URL`: the production API origin, in the form `https://<deployment>.convex.cloud`
   - `SITE_URL`: the matching production site origin, in the form
     `https://<deployment>.convex.site` (or the regional origin shown in Convex)

   Add `CONVEX_PRODUCTION_ENABLED` as a GitHub repository variable with the exact value `true`.

   The opt-in must be a repository variable because the caller checks it before the `prod`
   environment is attached. Leave it unset while checking the other values. The release job fails
   closed and remains skipped unless the value is exactly `true`.

For European deployments, use the full regional origins shown by the dashboard, including
`eu-west-1` in both URLs.

The deploy key can deploy backend code and can run the internal queries and mutations needed by the
static-hosting uploader. Treat it as a powerful production credential. Keep environment approvals
or branch protection enabled as appropriate, rotate the key if it is exposed, and never put it in a
repository variable or workflow-wide environment block.

## Release paths

A push to `main` runs the complete **Checks** workflow. Only after every check succeeds does CI call
the private **Release Production** workflow. The manual **Deploy Production** workflow is available
for a deliberate rerun from `main`; it also reruns **Checks** before calling the same release job.

Both paths accept only events from `nicksan222/groam`, `refs/heads/main`, and the immutable commit in
`github.sha`. Immediately before the first production mutation, the release job checks that this SHA
is still the remote `main` tip. A newer main push makes the older run stop instead of publishing an
outdated release. Production jobs share one non-canceling concurrency group, so they run serially.
Pull-request CI can still cancel superseded runs; a main run is not canceled midway through a
release.

The job installs dependencies and builds without the deploy key. Only `bun run deploy:production`
receives `CONVEX_DEPLOY_KEY`; the smoke test runs without it. Releases build directly from the tested
SHA and do not consume artifacts produced by pull requests or other untrusted runs.
The dedicated [`@groam/deploy`](../tooling/deploy/README.md) workspace owns build, publication,
release-manifest validation, and public smoke orchestration; the workflows only enforce the trusted
GitHub boundary and call its root scripts.

## Published routes and smoke coverage

The initial domain layout is:

- `/` and the other root pages: English landing site
- `/it/` and other `/it/.../` pages: Italian landing site
- `/app/`: signed-in web application
- root authentication callback routes: Convex HTTP actions used by Better Auth

The production smoke check covers the English landing page, an Italian landing page, the `/app/`
application, and representative missing routes that must return `404`. The CI journey job publishes
both static components locally and checks the same `/app/` mount before a release can proceed.

Hosted ChatGPT account connections are currently disabled by the application code because shared
hosted use requires OpenAI-approved access. Production deployment does not enable them. The privacy
and terms pages are still drafts; resolve the owner and legal-review items in
[`landing-launch-readiness.md`](./landing-launch-readiness.md) before treating them as published
acceptance terms.

## Operating a release

For routine changes, merge into `main` and watch the CI **Deploy production** job after tests finish.
For a retry, open **Actions → Deploy Production**, choose **Run workflow** on `main`, and inspect the
test and release jobs. A skipped release means the opt-in variable or a trusted event guard did not
match. A failure before deployment commonly means the configured public URLs are invalid or the
tested SHA is no longer current main; start a fresh run from the latest `main` rather than weakening
the guard.
