# Runtime and deployment implementation

This file describes how the runtime and deployment decisions in
[`README.md`](./README.md) are implemented: the pinned toolchain, local process
orchestration, environment validation, HTTP composition, hosted deployment,
and the verification layers. The pseudocode is simplified from the source;
when the two disagree, the source wins.

## Dev container and pinned toolchain

Development and CI share one toolchain definition. The dev container pins its
tools as `ARG` defaults in the Dockerfile (Vite+, Claude Code, Graphify,
Headroom) on a Node 24 Trixie base, and installs Bun `1.3.11` as a container
feature. The workspace itself pins Bun through `packageManager` and Node
through `convex.json`; `@groam/devkit/constants` reads both and fails at import
time when either is missing. CI installs the same versions in the
`setup-workspace` composite action.

```ts
// post-create.sh: VP_GIT_HOOKS=0 vp install --frozen-lockfile; vp run test:browsers:install
// tooling/devkit/constants.ts
const bunVersion = packageJson.packageManager.replace(/^bun@/, ''); // "1.3.11"
const nodeMajor = Number(convexJson.node.nodeVersion);              // 24
if (!bunVersion || !Number.isInteger(nodeMajor)) throw new Error('Unable to resolve toolchain pins');
export const localPorts = { convexApi: 3210, convexSite: 3211, dashboard: 6790, web: 5173 };
```

Source: [`Dockerfile`](../../../.devcontainer/Dockerfile),
[`devcontainer.json`](../../../.devcontainer/devcontainer.json#L44),
[`post-create.sh`](../../../.devcontainer/post-create.sh#L16),
[`constants.ts`](../../../tooling/devkit/constants.ts#L5),
[`setup-workspace`](../../../.github/actions/setup-workspace/action.yml#L7).

## Local process orchestration with `just dev`

`just dev` runs `CONVEX_AGENT_MODE=anonymous vp run dev`. The root `predev`
lifecycle script runs `tooling/devkit/prepare-convex.ts` first; then `vp run`
starts every workspace `dev` script in parallel with labeled output. Only two
workspaces define one: `@groam/backend` runs `convex dev --typecheck-components
--start 'convex dashboard'` (API on 3210, HTTP on 3211, dashboard
on 6790), and `@groam/web` runs `vp dev --host 0.0.0.0` on 5173 (Void serves the app at
the origin root; the landing site runs separately on 4321). The local
backend is anonymous and self-hosted; its state lives in the git-ignored
`.convex/local/` directory and persists across restarts.

`prepare-convex.ts` bootstraps the backend, waits for it, configures auth, and
then stops the bootstrap process so the dev watcher can own the backend. The
readiness probe asks `/instance_name` for a non-empty body with a 750 ms
per-request timeout; waits poll every 2 s for up to 180 s unless
`GROAM_STARTUP_TIMEOUT_MS` or `GROAM_READY_TIMEOUT_SECONDS` overrides it.

```ts
// tooling/devkit/prepare-convex.ts
const backendUrl = env.convexUrl || 'http://127.0.0.1:3210';
if (!(await isConvexBackendResponding(backendUrl))) runConvex(['init']); // bunx convex init
try { await waitForBackend(backendUrl, { timeoutMs: resolveWaitTimeoutMs() }); }
catch { log('Skipping auth configuration until Convex is running.'); exit(0); }
configureAuth({ siteUrl: 'http://localhost:5173', writeViteSiteUrl: true });
// stopLocalBackend: SIGTERM `convex-local-backend --port 3210 ... <repo>/.convex/local/`
// from `ps`, poll 20 x 100 ms, then SIGKILL as a last resort.
if (await isConvexBackendResponding(backendUrl) && !(await stopLocalBackend(backendUrl, projectRoot))) exit(1);

// tooling/devkit/configure-auth.ts
if (!runConvex(['env', 'list', '--names-only']).has('BETTER_AUTH_SECRET'))
  runConvex(['env', 'set', 'BETTER_AUTH_SECRET'], { input: randomBytes(32).toString('base64url') });
runConvex(['env', 'set', 'SITE_URL', siteUrl]);
if (writeViteSiteUrl) upsertViteSiteUrl('.env.local', siteUrl); // one VITE_SITE_URL= line
```

The secret is piped through stdin, so it never appears in a process argument
list. `runConvex` always spawns `bunx convex` from the repository root with
`CONVEX_AGENT_MODE` from the `convex-tooling` env target (default
`anonymous`).

Source: [`Justfile`](../../../Justfile#L20),
[`package.json`](../../../package.json#L61),
[`backend package.json`](../../../packages/backend/package.json#L67),
[`prepare-convex.ts`](../../../tooling/devkit/prepare-convex.ts),
[`configure-auth.ts`](../../../tooling/devkit/configure-auth.ts#L38),
[`run-convex.ts`](../../../tooling/devkit/run-convex.ts#L25),
[`local-backend.ts`](../../../tooling/devkit/local-backend.ts#L26),
[`wait-for-backend.ts`](../../../tooling/devkit/wait-for-backend.ts#L17).

## Environment validation and the client/server split

`@groam/env` exposes one Envalid-validated target per runtime, each exported
as a subpath (`auth-client`, `web-client`, `landing`, `convex-tooling`, `seeder`,
`journeys`, `vitest`, `production`). Client targets read only `import.meta.env`
`VITE_*` keys, so provider tokens and server secrets have no path into the
browser bundle. The `web-client` target includes `VITE_LANDING_URL`, where the
app links Terms and Privacy on the separate landing site. The Convex runtime is separate: it
declares its variables with `defineApp({ env })` and reads them from the
generated `env`. `BETTER_AUTH_SECRET` and `SITE_URL` are deployment variables
set by `configure-auth.ts` locally. The owner configures them directly in the
Convex dashboard for production; CI cannot read or write them. They are not
managed by `@groam/env`.

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
the ChatGPT OAuth callback. The Void Worker on Cloudflare serves the web app on a separate origin;
there is no frontend catch-all in Convex. Better Auth trusts the `SITE_URL` origin; when either `SITE_URL` or `CONVEX_SITE_URL`
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

Groam has one production release path. A push to `main` calls the private
**Release Production** workflow only after the complete **Checks** workflow
succeeds. The manually dispatched **Deploy Production** workflow reruns those
checks and then calls the same release job. Callers and the release job require the
original `nicksan222/groam` repository, the appropriate push or manual event,
`refs/heads/main`, and the fail-closed `CONVEX_PRODUCTION_ENABLED == 'true'`
opt-in.

The release checks out the immutable tested `github.sha` and installs the
lockfile. Immediately before publishing, it verifies that the SHA is still the
remote `main` tip. `deploy:production` checks the publisher, the clean checkout,
and that both environment-specific frontend locks in `tooling/deploy/locks/production/` are
committed. It runs the Convex environment preflight, deploys the Convex backend
with the production-scoped `CONVEX_DEPLOY_KEY`, and then runs
`void deploy --platform cloudflare` with `CLOUDFLARE_API_TOKEN` in `apps/web`
and in `apps/landing`. The web app and the landing site are separate Void
projects (`groam-app`, `groam-landing`) at separate origins. Each `void deploy`
builds its app and Void checks the new version before it takes traffic, so no
separate build, preview, or smoke step remains. Each child command receives only
its own credential, and builds receive public destinations only. Production
jobs are serialized and never cancel one another.

```sh
# CI push-main or manual Deploy Production
uses test-reusable.yml
uses release-production.yml
git ls-remote origin refs/heads/main     # must still equal GITHUB_SHA
CONVEX_DEPLOY_KEY=... bun run deploy:production
# release.ts: convex deploy, then `void deploy --platform cloudflare`
# from apps/web and then from apps/landing
```

Each environment's public settings (Convex URL, Worker names, hostnames, optional Cloudflare
account) live in [`environments.ts`](../../../tooling/deploy/src/environments.ts). Void creates the
Workers and their custom domains from them, and the release sets Convex `SITE_URL` to the web
origin and generates `BETTER_AUTH_SECRET` once if it is missing. The backend HTTP origin is derived
from the Convex URL. Frontend resource locks are committed under `tooling/deploy/locks/<environment>/`;
the release runner copies the selected lock into each app temporarily and removes it afterward.
Beta uses separate Convex, Cloudflare, and GitHub resources; **Deploy Beta** reruns Checks and
accepts only manual releases from current main, guarded by `CONVEX_BETA_ENABLED`. Each GitHub
environment holds only `CONVEX_DEPLOY_KEY` and `CLOUDFLARE_API_TOKEN`. See the [deployment runbook](../../deployment.md) for
the exact setup and operating procedure.

Source: [`ci.yml`](../../../.github/workflows/ci.yml),
[`deploy-production.yml`](../../../.github/workflows/deploy-production.yml),
[`release-production.yml`](../../../.github/workflows/release-production.yml),
[`apps/web/void.config.ts`](../../../apps/web/void.config.ts),
[`apps/landing/void.config.ts`](../../../apps/landing/void.config.ts),
[`release.ts`](../../../tooling/deploy/src/release.ts), and
[`target.ts`](../../../tooling/deploy/src/release/target.ts).

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
starting its watcher, runs `configure-auth.ts`, verifies that `bun run codegen`
leaves no diff, and runs the journeys. Release builds are not rehearsed in CI;
`void deploy` builds and checks each frontend during the release.
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
const options = parseSeedOptions(argv);         // --scale, --users, --trips, --concurrency, --no-reset
const app = createBackendActions({ convexUrl: env.seedConvexUrl, siteUrl: env.seedSiteUrl });
await seedWorkspace(app, { owner: { email: env.seedUserEmail, ... }, reset: options.reset, scenario });

// tooling/app-actions/src/backend/reset-local-development-data.ts
assertLocalDevelopmentUrl(convexUrl);
const credentials = readLocalConvexCredentials(root, convexUrl); // port must match ports.cloud
for (const batch of chunks([...schemaTables, ...componentResetTargets], 8))
  await Promise.all(batch.map((t) => replaceLocalConvexTable(credentials, t)));
```

Source: [`package.json`](../../../package.json#L82),
[`cli.ts`](../../../tooling/seeder/src/cli.ts),
[`seed-scenario.ts`](../../../tooling/seeder/src/seed-scenario.ts),
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

- Local ports and origins are 3210, 3211, 6790 and 5173, and the toolchain pins
  come from `package.json` and `convex.json`:
  [`constants.test.ts`](../../../tooling/devkit/constants.test.ts).
- Tool pins live only in Dockerfile `ARG` defaults, never as duplicate build
  args: [`agent-tooling.test.ts`](../../../tooling/quality/agent-tooling.test.ts),
  with configuration validated by `vp run lint:agents` and helper tests run by
  `vp run test:quality`.
- Auth setup keeps an existing `BETTER_AUTH_SECRET` and upserts one
  `VITE_SITE_URL` line: [`configure-auth.test.ts`](../../../tooling/devkit/configure-auth.test.ts).
- Shutdown only stops this repository's backend, and another HTTP server is
  not mistaken for Convex:
  [`local-backend.test.ts`](../../../tooling/devkit/local-backend.test.ts).
- `import.meta.env` appears only in `packages/env`
  ([`conventions.ts`](../../../tooling/quality/conventions.ts#L202)), and
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
  Production destinations, the separate app and landing origins, and credential
  isolation are tested in
  [`publisher.test.ts`](../../../tooling/deploy/src/release/publisher.test.ts).

## Extending

- **New environment variable.** Follow the
  [`add-env-variable`](../../../.agents/skills/add-env-variable/SKILL.md) skill:
  add an Envalid field to the matching `packages/env/src/apps/<target>.ts`
  (client keys must be `VITE_*` and never carry secrets), or a `defineApp`
  entry in `convex.config.ts` for a Convex runtime value. Document it in the
  `packages/env` README table.
- **New local process or port.** Add a `dev` script to the owning workspace so
  `vp run dev` picks it up, add the port to `localPorts` and `localOrigins` in
  `tooling/devkit/constants.ts` (and its test), forward it in
  `devcontainer.json`, and extend `isDevStackResponding` when the stack is not
  ready without it. A new browser origin also needs an entry in
  `modules/auth/origins.ts`.
- **New CI step.** Add it to a job in `test-reusable.yml` so CI and the deploy
  workflow both run it, and to the root `check` script when it should run
  locally too.
- **New seed data.** Use the
  [`seed-local-data`](../../../.agents/skills/seed-local-data/SKILL.md) skill;
  seed plans live in `tooling/seeder` and call only `@groam/app-actions/backend`
  primitives.
