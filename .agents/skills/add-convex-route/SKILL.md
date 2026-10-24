---
name: add-convex-route
description: >-
  Add a public Convex function under packages/backend/convex/routes as
  `export const run`. Use when exposing a new query, mutation, or action to
  the client (api.routes.*). Not for schema, helpers, or scheduled jobs
  (use add-backend-module).
---

# Add a public Convex route

Public functions live under `packages/backend/convex/routes/`, one file per
operation exporting `run`. The file path determines the generated API path.
Read `packages/backend/convex/_generated/ai/guidelines.md` first.

1. Find a nearby route with the same authorization and mutability needs.
   Search `packages/backend/convex/modules/auth/` and
   `packages/backend/convex/modules/travel/trips/ctx.ts` for its builder definition.
   Check what context it binds, which args it consumes, and whether it resolves a
   shared trip or permits draft edits; do not choose a builder by name alone.
2. Reuse the domain schema validators and facade. Keep the handler thin.
   For an example, read `packages/backend/convex/routes/trips/issues/create.ts`,
   then follow `TripIssues.create` into
   `packages/backend/convex/modules/travel/issues/index.ts` and its implementation.
   Use the current signature and bound context rather than copying a Markdown snippet.
3. Follow the package's private import mappings in `packages/backend/package.json`.
   Read runtime env through the generated server export, never `process.env`.
4. Discover and run the current Convex codegen command from the root manifest.
   Cover the public route with `add-convex-test`; web consumers use
   `add-feature-hook`.

Scheduled jobs and Node-only internal actions belong in modules. Node files
must invoke internal mutations for database writes instead of accessing `ctx.db`.
