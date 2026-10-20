---
name: add-convex-test
description: >-
  Add a convex-test for Groam backend behavior using the shared #testing
  factory and real public routes. Use when testing a Convex mutation, query,
  action, authz denial, or itinerary write — never mock procedures, auth, or
  component calls.
---

# Add a Convex test

Colocate the test with the backend module. Import test APIs from
`vite-plus/test`; use the shared `#testing` fixtures and real public routes.

1. Inspect `packages/backend/testing/factory.ts` and `trips.ts` for current
   setup helpers, roles, and the distinction between shared trips and working
   draft ids. Discover other fixtures in `packages/backend/testing/` rather than
   recreating authentication, media, or version setup.
2. Read a nearby `*.test.ts` using the same route or domain helper. Drive
   `api.routes.*.run` through authenticated clients, assert persisted behavior,
   and cover the relevant outsider or role-denial case.
3. Reuse fixture timeouts and scheduled-function handling from comparable tests
   and `packages/backend/vite.config.ts`; inspect timer state before awaiting
   scheduled work. Model doubles belong in colocated tests and replace provider
   responses while the real agent loop exercises tools and persistence.
4. Read `tooling/vitest-config` for console expectations. Declare expected output
   with the shared helper rather than silencing console calls.
5. Find the focused test command in `packages/backend/package.json` and root
   scripts; run the affected test in the supported runtime from `AGENTS.md`.

Do not mock procedures, authorization, storage, or component calls. Keep direct
`ctx.db` access in modules and routes, not tests.
