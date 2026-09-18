<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`packages/backend/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Environment and tooling

Import validated variables from the target-specific `@groam/env/*` module. Do
not read `process.env` or `import.meta.env` outside `packages/env`; Convex code
uses the generated typed `env` from `_generated/server`. Biome is the sole
formatter and linter. Shared Biome, TypeScript, and React Doctor configuration
belongs under `tooling`; keep only Biome's required discovery shim at the
repository root.

### Dev container execution boundary

The checked-in dev container is the only supported development environment and
the source of truth for every repository tool and dependency. When operating
from a host environment such as the Codex app, first ensure it is running:

```bash
.devcontainer/devcontainer up
```

Run every non-Git shell command inside it:

```bash
.devcontainer/devcontainer exec <command> [args...]
```

This includes `just`, Bun, Node, Python, Graphify, `rg`, code generation,
linters, typechecks, tests, builds, seeders, and development servers. Git
commands may run directly on the host because the workspace is bind-mounted.
The checked-in launcher still delegates to the official Dev Container CLI and
also mounts Git's common directory when Codex or another worktree stores it
outside the workspace. On a clean host, run
`.devcontainer/devcontainer exec just check` before
committing and use `git commit --no-verify` so Husky does not launch repository
tooling outside the container. The `devcontainer` command itself also runs on
the host. If Docker or the Dev
Container CLI is unavailable, stop and ask the user to enable it; do not install
project tooling on the host and do not fall back to host runtimes. Do not patch
an ephemeral running container with global installs either; add or pin tooling
in `.devcontainer/`, rebuild, and keep the setup reproducible. When already
running inside the dev container or Codespaces, run repository commands
directly without nesting another `devcontainer exec`.

## Code search with Graphify

The dev container preinstalls the pinned Graphify CLI and builds a local,
code-only graph at `graphify-out/graph.json`. For architecture, ownership,
call-flow, or cross-file questions, start with
`.devcontainer/devcontainer exec just graphify-query "<question>"`,
then inspect the returned source files. Use the same prefix with
`just graphify-path "A" "B"` or `just graphify-explain "symbol"`. Omit the
prefix only when already inside the container. These recipes incrementally
refresh the graph first. Use containerized `rg` for exact strings.

If Graphify or its graph is missing inside the container, rebuild it with
`.devcontainer/devcontainer rebuild` and then run
the containerized `just graphify-refresh`. Never install Graphify, `uv`, Python,
or any other project tooling on the host. Do not install Graphify's Git hooks;
this repository already manages hooks through Husky.

## Web architecture

Add product routes as independent TanStack Router files under
`apps/web/src/routes`; never hand-edit `routeTree.gen.ts` or recreate a central
route registry. Route files should only compose feature views. Keep reusable
queries, mutations, and async state in `features/<domain>/hooks`, and split
high-churn context (dialogs, selections) from stable workspace data so unrelated
pages do not rerender.

## Backend architecture

Public Convex functions live under `packages/backend/convex/routes` as
`export const run`. Domain modules under `packages/backend/convex/modules`
export schema fragments, custom function builders, and plain helpers that take
an enriched `ctx`. Builders from `convex-helpers` bind `workspace` and `trip`
onto `ctx` so handlers do not thread auth bags. Do not add entity classes.
See `packages/backend/convex/modules/README.md`.

## UI development

The shared UI package is `packages/ui`, adapted from OwnFit's component system.
Apps import primitives through `@groam/ui/components/*`, shared hooks through
`@groam/ui/hooks/*`, and global styles through `@groam/ui/styles`. Keep reusable
UI behavior in this package instead of duplicating primitives in apps. Apps
may also import `@groam/ui/lib/*` for shared className and avatar helpers.

## Source conventions

`bun run lint:conventions` (via `tooling/quality`) enforces kebab-case folder
and source names, package-alias imports instead of `../`, semantic color
tokens, Convex `ctx.db` only in `modules/` and `routes/` (never in `'use node'` files), `@groam/env/*`
instead of raw Vite env access, public `@groam/ui` entrypoints, and thin
TanStack route files that only compose feature views.

## Development runtime

The dev-container image pins Bun `1.3.11` (`packageManager`), Node `24`
(`convex.json` `nodeVersion`), native dependencies, Just, and Graphify. Its
post-create command installs the locked workspace and prepares the local code
graph. This replaces environment-specific host installers: Cursor Cloud and
other agents must also enter or invoke the dev container rather than installing
their own toolchains.

Inside the container, start the stack with `just dev`. It uses Turbo's `--ui=tui`
interface when attached to a TTY and falls back
to streamed output otherwise. The individual steps are also available:
`CONVEX_AGENT_MODE=anonymous bunx convex dev --typecheck-components` (backend,
writes `.env.local`), `CONVEX_AGENT_MODE=anonymous bun
tooling/devkit/configure-auth.ts --write-vite-site-url` (Better Auth
`BETTER_AUTH_SECRET`/`SITE_URL` + `VITE_SITE_URL`), and
`bun run dev:web` (Vite only).

Local Convex runs a self-hosted **anonymous** backend — set
`CONVEX_AGENT_MODE=anonymous` for every `convex` / `bunx convex` command so it
never prompts for a Convex login. No `CONVEX_ACCESS_TOKEN` or cloud account is
needed for local dev (that token is CI/deploy only, per `README.md`).

Ports: web `5173`, Convex API `3210`, Convex site/HTTP `3211`,
dashboard `6790`. Note `http://127.0.0.1:3211/` returns `503` in local dev
because no static site is uploaded — that is expected; the app is served by Vite
on `5173`, not the Convex site proxy.

Browser e2e against a running `bun run dev` stack: `bun run test:e2e:local`
(hits `http://localhost:5173`, which must match `VITE_SITE_URL` for Better
Auth). CI uses `test:e2e` against the uploaded static site on `3211`.

Seeded demo login (skip sign-up): the environment ships pre-seeded, so you can
log in immediately instead of walking through sign-up and group creation. Sign
in at `http://localhost:5173/` with the demo owner
`demo@groam.example` / `GroamDemo123!`; it already owns the "Groam Demo"
workspace with sample trips and travelers. Additional seeded travelers use
`traveler.NNN@groam.example` (zero-padded, e.g. `traveler.001@groam.example`)
with the same password. `tooling/seeder` owns seed scenarios, fixtures, plans,
batching, and composition; it executes reusable primitives from
`@groam/app-actions/backend`.
`SEED_USER_EMAIL` / `SEED_USER_PASSWORD` defaults remain in
`packages/env/src/apps/seeder.ts`.
Re-seed at any time (local backend must be running) with `bun run seed`
(defaults to 30 users / 40 trips), `bun run seed -- --scale small` (6 users /
8 trips, used for the environment baseline), or `--scale large`. Seeding does a
clean local reset by default; pass `--no-reset` to preserve existing data. The
seeded database lives in the git-ignored `.convex/` directory, so it persists
across restarts.

App onboarding gotcha (only relevant when NOT using the seeded login): after a
fresh sign-up you must create a group (organization) before the app is usable.
The onboarding "Create group" button is intentionally disabled until you type a
group name (placeholder "Acme Labs" is not a value) — this is not a bug.

Use the root `Justfile` as the in-container command map (`just`, `just dev`,
`just check`, `just codegen`). The package scripts remain the composable
primitives used by Just, Turbo, lifecycle hooks, and
`.github/workflows/test-reusable.yml`; the AI
assistant features are optional and only need an LLM provider key (see
`packages/env`). Git pre-commit hooks (`tooling/husky/pre-commit`) run codegen,
lint-staged, conventions, React Doctor (staged), and Fallow (changed); CI owns
`bun run check`. On hosts without the project toolchain, replace those hooks
with the full containerized `just check` gate and commit with `--no-verify`.
Installs use `HUSKY=0` (matching CI) so container setup is independent of where
Git metadata is mounted.
