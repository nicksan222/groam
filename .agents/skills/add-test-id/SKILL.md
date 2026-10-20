---
name: add-test-id
description: >-
  Add a stable data-testid for Groam browser-mode view tests and journeys.
  Use when a new control, dialog, row, or empty-state action needs a test
  hook — ids live in @groam/app-actions/ids, never as inline strings in one
  app.
---

# Add a test id

Stable locators originate in `tooling/app-actions/src/testing/ids.ts`, published
through `@groam/app-actions/ids` and re-exported for web views by
`apps/web/src/lib/test-ids.ts`.

1. Search the registry and usages for an existing locator before adding a
   unique camelCase key with a kebab-case value, following current ordering.
2. Use that shared key on the control and in browser tests. Do not repeat string
   literals in JSX or separate app-specific registries.
3. Reuse repeated interactions from `tooling/app-actions/src/vitest/`, extending
   its published helpers when a shared browser step is needed.
4. For full journeys, inspect `apps/web/e2e/`, `apps/web/src/journeys/open-app.tsx`,
   and existing arrangement helpers for current accounts and setup. Arrange
   supporting data through backend actions and drive the flow under test in UI.

Give stable ids to actionable dialogs, primary controls, list rows, navigation,
and empty-state actions. Decorative icons do not need test hooks.
