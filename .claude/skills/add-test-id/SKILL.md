---
name: add-test-id
description: >-
  Add a stable data-testid for Groam Playwright and Testing Library locators.
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

3. Query the same key in tests: `screen.getByTestId(testIds.agentStop)` in
   Testing Library (`add-web-view-test`), `page.getByTestId(ids.agentStop)`
   in Playwright.
4. For a repeated browser journey, add or reuse a helper in
   `tooling/app-actions/src/playwright/<verb>.ts` (exported from its
   `index.ts`) instead of repeating the steps in a spec under
   `apps/web/e2e/`.
5. Specs import `test`/`expect` from `@groam/app-actions/playwright/test`:
   `page` is already signed in as the worker's own account and group, and
   the `arrange` fixture creates trips, ideas, issues, and members through
   the backend. Drive only the journey under test through the UI; second
   users get a page from `newSignedOutPage()`.

## Rules

- Values are kebab-case and unique across the object.
- Never hardcode `'agent-stop'` in JSX or tests when a key exists.
- Dialogs, primary CTAs, list rows, nav links, and empty-state actions get
  ids; decorative icons do not.
