---
name: add-web-view-test
description: >-
  Add a Vitest + Testing Library test for a Groam feature view. Use when
  covering a React screen, empty/error state, or sidebar row — mock hooks and
  agent context, do not spin up Convex.
---

# Add a web view test

Colocate `<name>.test.tsx` next to the component in
`apps/web/src/features/<domain>/`. Run with the package `vitest` (via
`turbo run test`).

## Pattern

Mock workspace, Convex hooks, router, and agent context. Render the view;
assert visible copy and `data-testid`s.

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AgentsListView } from './agents-list-view';

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('./hooks/use-agent-roster', () => ({
  useAgentRoster: () => ({ agents: [], isLoading: false })
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  )
}));

afterEach(() => cleanup());

test('shows the agents heading', () => {
  render(<AgentsListView />);
  expect(screen.getByTestId('agents-title')).toBeTruthy();
});
```

Use `testIds` from `@/lib/test-ids` in the component, and the same string
(or `testIds.foo`) in the assertion. New ids belong in `@groam/e2e/ids`
(`add-test-id`).

## Rules

- Do not call Convex in view tests; mock the feature hook.
- Keep hook unit tests in `hooks/<name>.test.ts` when the logic is pure.
- `packages/ui` primitives get their own `*.test.tsx` next to the primitive.
