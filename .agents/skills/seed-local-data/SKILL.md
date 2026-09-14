---
name: seed-local-data
description: >-
  Seed or reset Groam local demo data through tooling/seeder. Use when the
  database is empty, you need demo@groam.example, extra travelers, or a
  clean local Convex reset — never against remote deployments.
---

# Seed local data

The seeder talks to the **local** anonymous Convex backend only. It refuses
non-localhost URLs. Start Convex first (`bun run dev` or the Convex
process), then:

```bash
bun run seed -- --scale small      # 6 users / 8 trips (cloud baseline)
bun run seed                       # 30 users / 40 trips
bun run seed -- --scale large
bun run seed -- --no-reset         # keep existing rows; match by identity
```

## Login

- Owner: `demo@groam.example` / `GroamDemo123!` (workspace "Groam Demo")
- Extra travelers: `traveler.001@groam.example`, same password

Credentials are `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` in
`packages/env/src/apps/seeder.ts`.

## Where code lives

| Path | Role |
| --- | --- |
| `tooling/seeder/src/core/` | orchestration, concurrency, sessions |
| `tooling/seeder/src/scenarios/` | deterministic people/trip plans |
| `tooling/seeder/src/seeders/users/` | Better Auth users/memberships |
| `tooling/seeder/src/seeders/data/` | product rows via **real** `api.routes.*.run` |

New seedable entities: add a function under `seeders/data/` that calls the
public Convex route as the demo owner. Do not insert into Better Auth tables
or bypass permissions.

The database is `.convex/` (gitignored). Default run resets application
tables first.
