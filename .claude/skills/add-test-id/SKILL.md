---
name: add-test-id
description: >-
  Add a stable data-testid for Groam browser-mode view tests and journeys.
  Use when a new control, dialog, row, or empty-state action needs a test
  hook — ids live in @groam/app-actions/ids, never as inline strings in one
  app.
---

# Add a test id

Stable locators are the `ids` object in
`tooling/app-actions/src/playwright/ids.ts`, published as
`@groam/app-actions/ids`. The web app re-exports it as `testIds` from
`@/lib/test-ids`.

## Steps

1. Add a camelCase key and kebab-case value to `ids`, in alphabetical
   position:

   ```ts
   agentStop: 'agent-stop',
   ```

2. Use it on the control:

   ```tsx
   import { testIds } from '@/lib/test-ids';

   <Button data-testid={testIds.agentStop}>Stop</Button>
   ```

3. Query the same key in tests: `page.getByTestId(testIds.agentStop)` in
   view tests (`add-web-view-test`) and journeys.
4. For a repeated browser step, add or reuse a helper in
   `tooling/app-actions/src/vitest/<verb>.ts` (exported from its
   `index.ts`) built on `page` locators from `vite-plus/test/browser`,
   instead of repeating the steps in a test.
5. View tests and journeys use the same steps. Journeys
   (`apps/web/e2e/**/*.test.tsx`) mount the whole app with `openApp(path)`
   from `@/testing/open-app`, signed in as the file's own account and group;
   `arrange` from `@groam/app-actions/vitest` creates trips, ideas, issues,
   and members through the backend, and other people act through it too.
   Drive only the journey under test through the UI.

## Rules

- Values are kebab-case and unique across the object.
- Never hardcode `'agent-stop'` in JSX or tests when a key exists.
- Dialogs, primary CTAs, list rows, nav links, and empty-state actions get
  ids; decorative icons do not.
