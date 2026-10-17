---
name: add-web-view-test
description: >-
  Add a Vite+ browser-mode test for a Groam web feature view. Use when
  covering a React screen, loading/empty/error state, dialog, or sidebar row
  in apps/web — mock feature hooks and agent context, never spin up Convex
  (use add-convex-test for backend behavior).
---

# Add a web view test

Colocate `<name>.test.tsx` next to the component in
`apps/web/src/features/<domain>/`. View tests run in real Chromium (the
`views` browser setup of `vp test`) with the app's styles. Mock the feature
hooks, workspace state, router, and agent context; render the view; drive it
with `page` locators; assert with `expect.element`, which retries. Testing
Library and jsdom are not used.

## Pattern (from `agents/agent-list/agents-list-view.test.tsx`)

```tsx
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});

beforeEach(() => {
  state.isLoading = false;
  state.runs = [];
});

describe('AgentsListView', () => {
  test('shows a labeled loading state', async () => {
    state.isLoading = true;
    await render(<AgentsListView />);
    await expect.element(page.getByRole('status', { name: 'Loading agent runs…' })).toBeVisible();
  });

  test('shows the empty state', async () => {
    await render(<AgentsListView />);
    await expect.element(page.getByText('Nothing running yet')).toBeVisible();
    await expect.element(page.getByTestId(testIds.agentsRoster)).not.toBeInTheDocument();
  });
});
```

`render` and `renderHook` come from `@groam/vitest-config/react` and unmount
after each test. Interact like a user: `await page.getByLabelText(...).fill()`,
`.click()`. For many input combinations, drive the view through the shared
steps in `@groam/app-actions/vitest` (for example `createTrip(input)`) with
`test.each`, as `trip-create/create-trip-dialog.test.tsx` does.

```tsx
test.each<[string, CreateTripFormInput]>([
  ['only a name', { name }],
  ['a budget', { budget: 2500, name }]
])('creates a trip with %s', async (_, input) => {
  await render(<CreateTripDialog createTrip={createTrip} onClose={vi.fn()} onCreated={vi.fn()} />);
  await fillCreateTrip(input);
  await expect.poll(() => createTrip.mock.calls.length).toBe(1);
});
```

Reuse existing mocks before writing new ones: `@/lib/testing/router-mock` (`mockRouter`, `mockRouterTargets`),
`@/lib/testing/list-row-assertions`, and the fixtures in
`features/trips/testing/` (`trip-workspace-fixtures.ts`, `planner-fixtures.ts`).
Mock workspace state at
`@/features/workspace/workspace-shell/workspace-state` (`useWorkspace`).

## Rules

- Never call Convex in view tests; mock the hook (`add-feature-hook`).
- Locate by role/label or `testIds.*` — new ids go in
  `@groam/app-actions/ids` (`add-test-id`).
- Hook logic gets its own `hooks/use-<name>.test.ts(x)`; `packages/ui`
  primitives get a `*.test.tsx` beside the primitive.
- Console output fails the test unless declared with `expectConsole(level,
  pattern)` from `@groam/vitest-config/console`; never silence it with
  `vi.spyOn(console, …)`.

## Run

From `apps/web`: `vp test run --project views src/features/<domain>/<name>.test.tsx`.
Whole repo: `just test`. Full flows against the backend are journeys
(`apps/web/e2e`, `just journeys`); keep those few and cover combinations here.
