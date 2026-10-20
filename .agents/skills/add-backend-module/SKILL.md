---
name: add-backend-module
description: >-
  Add or extend a Convex domain module (schema fragment, builders, helpers)
  under packages/backend/convex/modules. Use when introducing a table,
  validator, custom builder, or shared write — not when only adding a public
  route file (use add-convex-route).
---

# Add a backend module

Modules own tables and writes; routes stay thin. Read
`packages/backend/convex/_generated/ai/guidelines.md` and
`packages/backend/convex/modules/README.md`, then inspect the closest existing
module under `packages/backend/convex/modules/`.

- Follow its schema fragment, validator, facade, and colocated test structure.
  Discover domain placement from the directory tree rather than inventing a
  sibling file beside an existing domain directory.
- Compose schema fragments in `packages/backend/convex/schema.ts`. Index scoped
  reads and paginate collections that can grow. Better Auth owns users,
  organizations, and memberships; reference their ids rather than cloning tables.
- Read the actual helper definition and callers before adapting signatures.
  Helpers receive bound context; share a write when another caller needs it.
  Facades are static namespaces, not entity instances or service factories.
- Discover context builders and internal counterparts in
  `packages/backend/convex/modules/travel/trips/ctx.ts` and the applicable auth
  module. Reuse their input composition so authorization and writes share the
  transaction. Import the facade outside a kind implementation directory.
- Node actions perform I/O and invoke internal mutations for database writes;
  they must not access `ctx.db`.

Use `add-convex-route` for public endpoints and `add-convex-test` for behavior.
Find current codegen, test, and typecheck commands in the package manifests.
