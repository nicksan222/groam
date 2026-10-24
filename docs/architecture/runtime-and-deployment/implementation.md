# Runtime and deployment implementation

This file describes how the runtime and deployment decisions in
[`README.md`](./README.md) are implemented: the pinned toolchain, local process
orchestration, environment validation, HTTP composition, hosted deployment,
and the verification layers. The pseudocode is simplified from the source;
when the two disagree, the source wins.

## Dev container and pinned toolchain

Development and CI share one toolchain definition. The dev container pins its
tools in the Dockerfile (Vite+ and Claude Code as `ARG` defaults, `just` as an image tag) on a
Node 24 Trixie base, and installs Bun `1.3.11` as a container feature. The
workspace itself pins Bun through `packageManager`, Node through `convex.json`,
and `just` through the `rust-just` dev dependency (CI runs it with `bunx just`).
CI installs the same versions in the `setup-workspace` composite action.

```sh
# post-create.sh
VP_GIT_HOOKS=0 vp install --frozen-lockfile
vp run test:browsers:install
```

Source: [`Dockerfile`](../../../.devcontainer/Dockerfile),
[`devcontainer.json`](../../../.devcontainer/devcontainer.json),
[`post-create.sh`](../../../.devcontainer/post-create.sh),
[`setup-workspace`](../../../.github/actions/setup-workspace/action.yml#L7).

## Local process orchestration with `just start-convex` and `just dev`

Convex and the web app start separately. `just dev` runs `vp run dev`, which starts
only `@groam/web` (`vp dev --host 0.0.0.0` on 5173; Vite serves the app at the origin
root). `just landing` runs the marketing site on 4321. `just dev` neither starts nor
bootstraps Convex.

`just start-convex` (`bun run start:convex`) asks whether to use a local backend or an
online dev deployment; `GROAM_CONVEX_MODE=local|online` skips the prompt and a missing
terminal falls back to local. Local runs `just prepare-convex` and then
`CONVEX_AGENT_MODE=anonymous convex dev --typecheck-components --start 'convex dashboard'`
(API on 3210, HTTP on 3211, dashboard on 6790); it is anonymous and self-hosted, with
state in the git-ignored `.convex/local/` directory. Online runs `convex dev --once`
(logging in if needed, writing `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` to `.env.local`),
configures auth through `configure-local-auth` without anonymous mode, then keeps
`convex dev` running. The dev container runs `.devcontainer/start-convex.sh` on attach
(`postAttachCommand`): it skips when Convex already responds, prompts in a terminal, and
otherwise starts the local backend in the background.

`prepare-convex` bootstraps the backend, waits for it, configures auth, and
then stops the bootstrap process so the dev watcher can own the backend. The
readiness probe asks `/instance_name` for a non-empty body with a 750 ms
per-request timeout; it polls every 2 s for up to 180 s unless
`GROAM_READY_TIMEOUT_SECONDS` overrides it.

```sh
# Justfile: prepare-convex
backend=${VITE_CONVEX_URL from .env.local:-http://127.0.0.1:3210}
responding || bunx convex init
until responding; do sleep 2; done   # gives up quietly after the timeout
just configure-local-auth --write-vite-site-url
# SIGTERM `convex-local-backend --port 3210 ... <repo>/.convex/local/` from `ps`,
# poll 20 x 100 ms, then SIGKILL as a last resort.

# Justfile: configure-local-auth (CI runs it too)
has BETTER_AUTH_SECRET || secret | bunx convex env set BETTER_AUTH_SECRET
bunx convex env set SITE_URL http://localhost:5173
# --write-vite-site-url: one VITE_SITE_URL= line in .env.local
```

Secrets are piped through stdin, so they never appear in a process argument
list. Every Convex command runs from the repository root with
`CONVEX_AGENT_MODE=anonymous`.

Source: [`Justfile`](../../../Justfile),
[`package.json`](../../../package.json#L61),
[`backend package.json`](../../../packages/backend/package.json#L67).

## Environment validation and the client/server split

`@groam/env` exposes one Envalid-validated target per runtime, each exported
as a subpath (`auth-client`, `web-client`, `landing`, `seeder`,
`journeys`, `vitest`). Client targets read only `import.meta.env`
`VITE_*` keys, so provider tokens and server secrets have no path into the
browser bundle. The `web-client` target includes `VITE_LANDING_URL`, where the
app links Terms and Privacy on the separate landing site. The Convex runtime is separate: it
declares its variables with `defineApp({ env })` and reads them from the
generated `env`, whose names come from `@groam/env/deployment` (the definition of every
hosted variable and secret, and the only `@groam/env` import allowed in the backend).
`BETTER_AUTH_SECRET` and `SITE_URL` are set by `just configure-local-auth`
locally; without `RESEND_API_KEY`, auth mail is logged by Convex and hosted sign-up skips email verification. Hosted
releases set `SITE_URL`, `AUTH_EMAIL_FROM`, and `BETTER_AUTH_SECRET`; the owner sets the rest, and the release
preflight checks they are present.

```ts
// packages/env/src/apps/auth-client.ts
const v = cleanEnv(
  { VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL, VITE_CONVEX_SITE_URL: import.meta.env.VITE_CONVEX_SITE_URL },
  { VITE_CONVEX_URL: url({ default: 'http://127.0.0.1:3210' }), VITE_CONVEX_SITE_URL: str({ default: '' }) }
);
// resolveConvexSiteUrl: explicit value wins; *.convex.cloud -> *.convex.site;
// local 127.0.0.1/localhost port + 1 (3210 -> 3211); anything else throws.
export const env = { convexUrl: v.VITE_CONVEX_URL, convexSiteUrl: resolveConvexSiteUrl(v.VITE_CONVEX_URL, v.VITE_CONVEX_SITE_URL) };

// web-client.ts adds VITE_SITE_URL, VITE_PHOTON_URL, VITE_MAP_TILES_URL

// packages/backend/convex/convex.config.ts
defineApp({ env: { CONVEX_SITE_URL: v.optional(v.string()), SITE_URL: v.optional(v.string()) } });
```

Source: [`packages/env/README.md`](../../../packages/env/README.md),
[`auth-client.ts`](../../../packages/env/src/apps/auth-client.ts),
[`web-client.ts`](../../../packages/env/src/apps/web-client.ts),
[`convex-url.ts`](../../../packages/env/src/lib/convex-url.ts),
[`convex.config.ts`](../../../packages/backend/convex/convex.config.ts#L10).

## HTTP router composition and auth origins

The Convex HTTP router serves backend HTTP endpoints: Better Auth routes and
the ChatGPT OAuth callback. After those routes, `registerSiteRoutes` adds the frontend catch-alls: the web SPA under `/app/` and the
landing site at `/` (longer and exact routes win). Better Auth trusts the `SITE_URL` origin; when either `SITE_URL` or `CONVEX_SITE_URL`
is local, it also trusts the Vite origins on ports 5173 (app) and 5174
(journeys) for `localhost`, `127.0.0.1` and `[::1]`.

```ts
// packages/backend/convex/http.ts
const http = httpRouter();
authComponent.registerRoutesLazy(http, createAuth, { cors: true, trustedOrigins: authTrustedOrigins });
http.route({ path: '/auth/chatgpt/callback', method: 'GET', handler: chatGptCallback });

// modules/auth/auth.ts and origins.ts
const authBaseUrl = env.CONVEX_SITE_URL ?? 'http://127.0.0.1:3211';
const authSiteUrl = env.SITE_URL ?? authBaseUrl;
trusted = { origin(authSiteUrl) } + (isLocal(authSiteUrl) || isLocal(authBaseUrl) ? localViteOrigins(5173, 5174) : []);
```

Source: [`http.ts`](../../../packages/backend/convex/http.ts#L10),
[`convex.config.ts`](../../../packages/backend/convex/convex.config.ts#L22),
[`auth.ts`](../../../packages/backend/convex/modules/auth/auth.ts#L14),
[`origins.ts`](../../../packages/backend/convex/modules/auth/origins.ts#L11).

## Hosted deployment and the CI deploy workflow

Every push to `main` is released automatically after the complete **Checks**
workflow succeeds. The reusable **Release** workflow preflights and then
deploys production; the manually dispatched **Release main** workflow
reruns Checks and the same pipeline. Each deploy job requires the original
`nicksan222/groam` repository, a push or manual event on `refs/heads/main`, and
its fail-closed opt-in
(`CONVEX_PRODUCTION_ENABLED`).

The release checks out the immutable tested `github.sha` and installs the
lockfile. Immediately before publishing, it verifies that the SHA is still the
remote `main` tip. `just deploy release production` checks the publisher, the clean checkout,
It runs the Convex environment preflight, deploys the Convex backend
with the production-scoped `CONVEX_DEPLOY_KEY`, and then runs
builds the landing site and the web app, and uploads each with the static-hosting CLI
into its component instance (`landing`, `web`). The web app uses SPA fallback, the landing
site its 404 page. Builds receive public destinations only; the deploy key reaches only the
Convex and upload commands. Production
jobs are serialized and never cancel one another.

```sh
# CI push-main or manual Release main
uses test-reusable.yml
uses release.yml
  production: git ls-remote … ; bunx just deploy release production
# tooling/deploy/justfile: convex deploy, then build and `static-hosting upload`
# for apps/landing and then apps/web
```

Production's public settings (Convex URL, optional custom domain, mail sender) live in [`environments.json`](../../../tooling/deploy/environments.json). The release sets Convex `SITE_URL` (`https://<host>/app`, or the deployment's `.convex.site` origin while `host` is empty) and
`AUTH_EMAIL_FROM`, and generates `BETTER_AUTH_SECRET` once if it is missing. The backend HTTP origin is derived
from the Convex URL. The GitHub `prod` environment holds only `CONVEX_DEPLOY_KEY`. See the [deployment runbook](../../deployment.md) for
the exact setup and operating procedure.

Source: [`ci.yml`](../../../.github/workflows/ci.yml),
[`release.yml`](../../../.github/workflows/release.yml),
[`release-main.yml`](../../../.github/workflows/release-main.yml),
[`modules/hosting/site.ts`](../../../packages/backend/convex/modules/hosting/site.ts),
and [`tooling/deploy/justfile`](../../../tooling/deploy/justfile).

## AI configuration constraints

ChatGPT authorization is available only where the backend's own
`CONVEX_SITE_URL` is a loopback HTTP origin with a port. The redirect URI is
always rewritten to `127.0.0.1`, so the browser that authorizes must reach the
local backend on 3211 (a tunnel for remote development). On any hosted
deployment, the settings report the feature as unavailable instead of using a
shared callback. No API-key fallback exists in configuration.

```ts
// packages/backend/convex/modules/ai/chatgpt/settings.ts
function chatGptAvailability(siteUrl = env.CONVEX_SITE_URL) {
  const url = new URL(siteUrl);
  if (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
      && !url.username && !url.password && url.port) {
    url.hostname = '127.0.0.1'; url.pathname = '/auth/chatgpt/callback';
    return { available: true, redirectUri: url.toString() };  // http://127.0.0.1:3211/auth/chatgpt/callback
  }
  return { available: false, unavailableReason: 'requires OpenAI-approved access', redirectUri: null };
}
```

Source: [`settings.ts`](../../../packages/backend/convex/modules/ai/chatgpt/settings.ts#L7),
[`AI configuration`](../../../packages/backend/convex/README.md#ai-configuration).

## Test layers and app-actions adapters

The layers cover different boundaries and do not replace each other.

- Backend tests use `convex-test` in the `edge-runtime` environment with the
  real component graph from `packages/backend/testing/factory.ts`. Only the
  model provider is replaced, with `mockModel` doubles defined in colocated
  `*.test.ts` files.
- View tests are the `views` browser-mode setup in Chromium through Vite+;
  they mount feature screens with mocked hooks and no backend.
- Journeys are the `journeys` setup (`apps/web/e2e/**/*.test.tsx`): the real
  app on fixed port 5174 against the running local backend, one account and
  group per test file created through the backend adapter.

`@groam/app-actions` defines each operation once (`src/actions/<verb>.ts`) with
a backend implementation; the Vitest driver supplies journey steps and
Node-side `arrange.*` commands. The backend adapter refuses any
non-localhost URL.

```ts
// apps/web/vite.config.ts
createWebVitestConfig(dir, { browser: { commands: journeyCommands, port: 5174, instances: [
  { name: 'views', include: ['src/**/*.test.tsx', ...], setupFiles: ['./src/views-setup.ts'] },
  { name: 'journeys', include: ['e2e/**/*.test.tsx'], maxWorkers: isCI ? 2 : 4, testTimeout: isCI ? 120_000 : 60_000 },
] } });

// app-actions: journey accounts use createBackendActions(@groam/env/journeys urls);
// backend-session.ts assertLocalDevelopmentUrl throws unless localhost over HTTP(S)
```

In CI, the `journeys` job initializes the local Convex backend successfully before
starting its watcher, runs `bunx just configure-local-auth`, verifies that `bun run codegen`
leaves no diff, and runs the journeys. Release builds are not rehearsed in CI;
the release builds each frontend.
Convex component upload commands are not part of frontend verification.

Source: [`vitest convex.ts`](../../../tooling/vitest-config/src/convex.ts),
[`factory.ts`](../../../packages/backend/testing/factory.ts#L62),
[`poll-agent.test.ts`](../../../packages/backend/convex/modules/polls/poll-agent.test.ts#L19),
[`apps/web/vite.config.ts`](../../../apps/web/vite.config.ts#L11),
[`app-actions README`](../../../tooling/app-actions/README.md),
[`backend-session.ts`](../../../tooling/app-actions/src/backend/backend-session.ts#L8),
[`test-reusable.yml`](../../../.github/workflows/test-reusable.yml#L137).

## Seeding and local data reset

`just seed` runs `bun --env-file .env.local tooling/seeder/src/cli.ts`. The
seeder owns scales (`small` 6 users / 8 trips, `realistic` 30 / 40, `large`
80 / 150), fixtures, and plans, and calls only backend-adapter primitives.
Unless `--no-reset` is passed, it first resets every root and component table
through the local backend's admin import API, using the admin key from
`.convex/local/default/config.json`. That key and the local auth records are
sensitive local data.

```ts
// tooling/seeder/src/cli.ts
const options = parseSeedOptions(argv);         // --concurrency, --no-reset
const app = createBackendActions({ convexUrl: env.seedConvexUrl, siteUrl: env.seedSiteUrl });
await seedWorkspace(app, { owner: { email: env.seedUserEmail, ... }, reset: options.reset, concurrency });

// tooling/app-actions/src/backend/reset-local-development-data.ts
assertLocalDevelopmentUrl(convexUrl);
const credentials = readLocalConvexCredentials(root, convexUrl); // port must match ports.cloud
for (const batch of chunks([...schemaTables, ...componentResetTargets], 8))
  await Promise.all(batch.map((t) => replaceLocalConvexTable(credentials, t)));
```

Source: [`package.json`](../../../package.json#L82),
[`cli.ts`](../../../tooling/seeder/src/cli.ts),
[`seed-groups.ts`](../../../tooling/seeder/src/seed-groups.ts),
[`reset-local-development-data.ts`](../../../tooling/app-actions/src/backend/reset-local-development-data.ts#L12),
[`read-local-convex-credentials.ts`](../../../tooling/app-actions/src/backend/read-local-convex-credentials.ts).

## Pre-commit hook and the `just check` gate

The root `prepare` script (`vp config --hooks-dir tooling/hooks`) points Git
at the repository hooks. The pre-commit hook regenerates and restages generated
contracts, fixes staged files, and runs cheap gates. `just check` is the full
gate; CI runs the same pieces as separate jobs in `test-reusable.yml`.
`just diagrams` renders each `docs/**/*.excalidraw` scene to the SVG beside it.

```sh
# tooling/hooks/pre-commit
vp run codegen && git add packages/backend/convex/_generated ...
vp staged && vp run lint:conventions && vp run react-doctor:staged
git stash push --keep-index --include-untracked; vp run fallow:changed; git stash pop

# just check -> vp run check
vp run audit && vp run typecheck && vp run lint && vp run test && vp run react-doctor && vp run fallow
# lint = lint:conventions && lint:agents && lint:packages && vp check
```

Source: [`pre-commit`](../../../tooling/hooks/pre-commit),
[`package.json`](../../../package.json#L52),
[`Justfile`](../../../Justfile#L42),
[`test-reusable.yml`](../../../.github/workflows/test-reusable.yml#L14),
[`render.ts`](../../../tooling/diagrams/src/render.ts),
[`CONTRIBUTING.md`](../../../.github/CONTRIBUTING.md#checks).

## Invariants and tests

- Tool pins live only in Dockerfile `ARG` defaults, never as duplicate build
  args: [`agent-tooling.test.ts`](../../../tooling/quality/agents/agent-tooling.test.ts),
  with configuration validated by `vp run lint:agents` and helper tests run by
  `vp run test:quality`.
- Local auth setup keeps an existing `BETTER_AUTH_SECRET`, shares one relay
  secret with `apps/web/.env`, and upserts one `VITE_SITE_URL` line; backend
  shutdown only stops this repository's `convex-local-backend` process
  ([`Justfile`](../../../Justfile), exercised by every `just start-convex` and the CI
  journeys job).
- `import.meta.env` appears only in `packages/env`
  ([`import-meta-env.json`](../../../tooling/quality/conventions/rules/import-meta-env.json)), and
  `process.env` only in `packages/env` and `tooling/`
  ([`lint.ts`](../../../tooling/oxc-config/lint.ts#L99)).
- The Convex site URL is derived or explicitly configured, never guessed:
  [`convex-url.test.ts`](../../../packages/env/src/lib/convex-url.test.ts).
- Local trusted origins include 5173 and 5174 only for local deployments:
  [`origins.test.ts`](../../../packages/backend/convex/modules/auth/origins.test.ts).
- ChatGPT authorization is unavailable on non-loopback deployments:
  [`settings.test.ts`](../../../packages/backend/convex/modules/ai/chatgpt/settings.test.ts).
- App actions and seed resets cannot target remote deployments:
  [`backend-session.test.ts`](../../../tooling/app-actions/src/backend/backend-session.test.ts).
- Static files are served before page routing, so the web app's not-found page
  never answers `/favicon.ico` or a missing `/x.js`:
  [`01.static-files.ts`](../../../apps/web/middleware/01.static-files.ts).
  Release guards (trusted publisher, separate app and landing origins, credential
  isolation) are enforced by
  [`tooling/deploy/justfile`](../../../tooling/deploy/justfile) and the release jobs are
  checked by
  [`workflows.test.ts`](../../../tooling/quality/release/workflows.test.ts).

## Extending

- **New environment variable.** Follow the
  [`add-env-variable`](../../../.agents/skills/add-env-variable/SKILL.md) skill:
  add an Envalid field to the matching `packages/env/src/apps/<target>.ts`
  (client keys must be `VITE_*` and never carry secrets), or a `defineApp`
  entry in `convex.config.ts` for a Convex runtime value. Document it in the
  `packages/env` README table.
- **New local process or port.** Add a `dev` script to the owning workspace, include
  it in the root `dev` filter, forward the port in `devcontainer.json`, and extend
  the `prepare-convex` recipe when Convex is not ready without it. A new
  browser origin also needs an entry in
  `modules/auth/origins.ts`.
- **New CI step.** Add it to a job in `test-reusable.yml` so CI and the deploy
  workflow both run it, and to the root `check` script when it should run
  locally too.
- **New seed data.** Use the
  [`seed-local-data`](../../../.agents/skills/seed-local-data/SKILL.md) skill;
  seed plans live in `tooling/seeder` and call only `@groam/app-actions/backend`
  primitives.
