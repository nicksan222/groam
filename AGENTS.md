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

## Cursor Cloud specific instructions

The Cloud Agent environment is defined in code by `.cursor/environment.json`
plus the `cloud-install` and `cloud-start` recipes in the root `Justfile`, so
future agents boot fully provisioned and gated on readiness:

- `just cloud-install` (the `install` step, baked into the Build) installs
  the pinned toolchain — Bun `1.3.11` (`packageManager`) and Node `24`
  (`convex.json` `nodeVersion`), prepended ahead of the sandbox's default
  `/exec-daemon/node` (v22) — runs `bun install --frozen-lockfile`, and seeds the
  local anonymous Convex backend (see "Seeded demo login" below). It writes a
  `groam cloud toolchain` block to `~/.bashrc` so `bun`/`node` resolve correctly
  in any interactive shell.
- `just cloud-start` (the `start` step) launches the full dev stack via the
  repo's canonical `bun run dev` (Turbo → Convex API `:3210`, Vite web `:5173`,
  Convex dashboard `:6790`) and **blocks until every service passes a health
  check**, so the agent only continues once the environment is fully ready. Live
  logs stream to `/tmp/groam-dev.log` and the `groam-dev` terminal. Relying on
  `bun run dev` keeps this scalable — Turbo discovers any new app's `dev` task
  automatically, so adding an app needs no environment change.

To (re)start the stack manually, run `bun run dev` from the repo root in a login
shell. It uses Turbo's `--ui=tui` interface when attached to a TTY and falls back
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

Use the root `Justfile` as the human-facing command map (`just`, `just dev`,
`just check`, `just codegen`). The package scripts remain the composable
primitives used by Just, Turbo, lifecycle hooks, and
`.github/workflows/test-reusable.yml`; the AI
assistant features are optional and only need an LLM provider key (see
`packages/env`). Git pre-commit hooks (`tooling/husky/pre-commit`) run codegen,
lint-staged, conventions, React Doctor (staged), and Fallow (changed); CI owns
`bun run check`. Installs use `HUSKY=0` (matching CI) so agent commits are not
blocked.
