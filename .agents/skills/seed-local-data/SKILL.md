---
name: seed-local-data
description: >-
  Seed or reset Groam local demo data through tooling/seeder when the local
  database is empty, demo travelers are needed, or a clean local Convex reset
  is requested. Never use against remote deployments.
---

# Seed local data

Use `tooling/seeder` only against the local development backend. Inspect the
active runtime and stack using `AGENTS.md`, `Justfile`, and package scripts.
Confirm the configured target is local before running a seed or reset.

1. Read `tooling/seeder/src/cli.ts`, `options.ts`, and `seed-groups.ts` (the authored
   cast, groups and trips), then use the CLI's current help to discover flag
   bounds and reset behavior. Do not assume remembered ports or credentials.
2. Inspect `packages/env/src/apps/seeder.ts` for configuration precedence and
   login defaults; use current local overrides without printing secrets.
3. Check `tooling/seeder/src/seed-workspace.ts` and the local-reset implementation
   before destructive runs. Default seeding may wipe local app/component data;
   use the current preservation option when the task requires keeping rows.
4. For a new entity, follow `tooling/app-actions/src/backend/` actions and their
   registration, then call the action from the seeder as a signed-in user.
   Use public routes and real permissions, not direct Better Auth table inserts.

Keep the existing localhost target guard. Never repoint this workflow to a
remote deployment or bypass route authorization to make seeding succeed.
