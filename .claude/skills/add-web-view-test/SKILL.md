---
name: add-web-view-test
description: >-
  Add a Vitest + Testing Library test for a Groam web feature view. Use when
  covering a React screen, loading/empty/error state, dialog, or sidebar row
  in apps/web — mock feature hooks and agent context, never spin up Convex
  (use add-convex-test for backend behavior).
---

# Add a web view test

Colocate `<name>.test.tsx` next to the component in
`apps/web/src/features/<domain>/`. Mock the feature hooks, workspace state,
router, and agent context; render the view; assert roles, copy, and test
ids.

## Pattern (from `agents/agent-list/agents-list-view.test.tsx`)

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { testIds } from '@/lib/test-ids';
import { AgentsListView } from './agents-list-view';

const state = vi.hoisted(() => ({ isLoading: false, runs: [] as unknown[] }));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ activeOrganization: { id: 'org-acme', name: 'Acme Labs' } })
}));

vi.mock('@/features/agents/hooks/use-workspace-agent-runs', () => ({
  useWorkspaceAgentRuns: () => ({
    isLoading: state.isLoading,
    loadMore: vi.fn(),
    runs: state.runs,
    status: 'Exhausted'
  })
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', async () => {
  const { createAgentTestRouterMock } = await import('@/features/agents/agent-test-router-mock');
  return createAgentTestRouterMock(navigate);
});

beforeEach(() => {
  state.isLoading = false;
  state.runs = [];
});
afterEach(cleanup);

describe('AgentsListView', () => {
  test('shows a labeled loading state', () => {
    state.isLoading = true;
    render(<AgentsListView />);
    expect(screen.getByRole('status', { name: 'Loading agent runs…' })).toBeTruthy();
  });

  test('shows the empty state', () => {
    render(<AgentsListView />);
    expect(screen.getByText('Nothing running yet')).toBeTruthy();
    expect(screen.queryByTestId(testIds.agentsRoster)).toBeNull();
  });
});
```

Reuse existing mocks before writing new ones: `@/testing/stub-match-media`,
`@/testing/trip-planner-fixture`, `features/trips/test-workspace-mocks.tsx`,
`features/agents/agent-test-router-mock.tsx`. Mock workspace state at
`@/features/workspace/workspace-shell/workspace-state` (`useWorkspace`).

## Rules

- Never call Convex in view tests; mock the hook (`add-feature-hook`).
- Locate by role/label or `testIds.*` — new ids go in
  `@groam/app-actions/ids` (`add-test-id`).
- Hook logic gets its own `hooks/use-<name>.test.ts(x)`; `packages/ui`
  primitives get a `*.test.tsx` beside the primitive.

## Run

From `apps/web`: `vp test run src/features/<domain>/<name>.test.tsx`.
Whole repo: `just test`.
