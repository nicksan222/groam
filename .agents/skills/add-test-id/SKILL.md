---
name: add-test-id
description: >-
  Add a stable data-testid for Groam Playwright and Testing Library locators.
  Use when a new control needs a test hook — ids live in @groam/e2e/ids, not
  as inline strings in one app only.
---

# Add a test id

Stable locators are the `ids` object in `tooling/e2e/src/ids.ts`, published as
`@groam/e2e/ids`. The web app re-exports them as `testIds` from
`@/lib/test-ids`. Reusable browser actions live beside them by product domain.

## Steps

1. Add a camelCase key and kebab-case value to `ids` in
   `tooling/e2e/src/ids.ts`:

   ```ts
   agentStop: 'agent-stop',
   ```

2. On the control:

   ```tsx
   import { testIds } from '@/lib/test-ids';

   <Button data-testid={testIds.agentStop}>Stop</Button>
   ```

3. In RTL, query that same id. For Playwright, add or reuse a domain action in
   `tooling/e2e/src/` instead of repeating the interaction sequence in a spec.

## Rules

- Values are kebab-case and unique in the object.
- Do not hardcode `'agent-stop'` in JSX if a key already exists.
- Dialogs, primary CTAs, list rows, and empty-state actions need ids;
  decorative icons do not.
