---
name: seed-local-data
description: >-
  Seed or reset Groam local demo data through tooling/seeder. Use when the
  local database is empty, you need demo@groam.example or extra travelers, or
  want a clean local Convex reset — never against remote deployments.
---

# Seed local data

The seeder only talks to the **local** anonymous Convex backend: app actions
reject any Convex URL that is not localhost over HTTP. Start the stack first
with `just dev`, then:

```bash
just seed --scale small              # 6 users / 8 trips
just seed                            # realistic: 30 users / 40 trips (default)
just seed --scale large              # 80 users / 150 trips
just seed --users 10 --trips 0       # workspace users only, no trips
just seed --no-reset                 # keep existing rows; reuse users/trips by identity
just seed --help
```

`just seed` runs `vp run seed`, i.e.
`bun --env-file .env.local tooling/seeder/src/cli.ts`. Other flags:
`--concurrency <1-20>`; `--users` is 1-100, `--trips` 0-1000, and trips
need at least 2 users.

## Login

- Owner: `demo@groam.example` / `GroamDemo123!` (workspace "Groam Demo")
- Extra travelers: `traveler.001@groam.example`, `traveler.002@...`, same password

Overrides are `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`; target URLs are
`SEED_CONVEX_URL` / `SEED_SITE_URL`, falling back to `VITE_CONVEX_URL` /
`VITE_CONVEX_SITE_URL`. All are defined in `packages/env/src/apps/seeder.ts`
(add new ones with `add-env-variable`).

## Where code lives

| Path | Role |
| --- | --- |
| `tooling/seeder/src/cli.ts`, `options.ts` | CLI entry and flag parsing |
| `tooling/seeder/src/seed-scenario.ts` | `small` / `realistic` / `large` presets |
| `tooling/seeder/src/seed-workspace.ts` | orchestration: reset, users, trips |
| `tooling/seeder/src/seed-workspace-users.ts`, `user-profiles.ts` | Better Auth users and memberships |
| `tooling/seeder/src/seed-workspace-trips.ts`, `build-trip-plans.ts` | deterministic trip plans |
| `tooling/app-actions/src/backend/` | `@groam/app-actions/backend`: actions that call real `api.routes.*.run`, plus `resetLocalDevelopmentData` |

To seed a new entity, add an action under `tooling/app-actions/src/backend/`
that calls the public Convex route as a signed-in user, wire it into
`createBackendActions`, and call it from the seeder. Never insert into
Better Auth tables or bypass route permissions.

The default run wipes every app and component table in the local deployment
(`.convex/local`, gitignored) before seeding; use `--no-reset` to keep data.
