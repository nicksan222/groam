---
name: add-web-view-test
description: >-
  Add a Vite+ browser-mode test for a Groam web feature view. Use when
  covering a React screen, loading/empty/error state, dialog, or sidebar row
  in apps/web — mock feature hooks and agent context, never spin up Convex
  (use add-convex-test for backend behavior).
---

# Add a web view test

Colocate browser-mode `*.test.tsx` beside the feature view. Read
`apps/web/vite.config.ts` and the web package scripts for current browser projects
and focused test commands; use the runtime described in `AGENTS.md`.

Use `apps/web/src/features/agents/agent-list/agents-list-view.test.tsx` as a
starting point, then inspect the view's actual imports and hook return types.

- Render with `@groam/vitest-config/react`; import test APIs and browser locators
  from the installed `vite-plus` test exports. The suite runs with app styles in
  a real browser, not jsdom or Testing Library.
- Mock feature hooks, workspace state, router, and screen context at the view
  boundary. Reset mutable mock state between tests. Do not start or call Convex.
- Find existing helpers in `apps/web/src/lib/testing/`, feature testing folders,
  and `tooling/app-actions/src/vitest/` before making new mocks or shared steps.
- Drive roles, labels, or registry test ids and use retrying element assertions.
  Cover meaningful loading, empty, error, and interaction cases; use parameterized
  tests when combinations change behavior.
- Hook logic gets its own colocated tests. Backend behavior uses
  `add-convex-test`; complete backend-connected flows belong in journeys.
- Read the shared console expectation helper in `tooling/vitest-config/` when
  output is expected; do not silence console calls with spies.
