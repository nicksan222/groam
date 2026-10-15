---
name: register-agent-screen-context
description: >-
  Register useSetAgentContext on a Groam product page so the assistant knows
  title, purpose, visible data, and capabilities. Use when adding or changing
  a workspace page, trip section, or any screen the compact assistant can see.
---

# Register agent screen context

Every product page calls `useSetAgentContext` from
`@groam/ai/ui/context/agent-context`. Call it in the **feature view**, not the
route file. `apps/web/src/features/assistant/agent-context-coverage.test.ts`
walks each route to its feature view and fails if none registers context
(pure layout routes are listed in its `infrastructureRoutes`).

## Shape

Adapted from `apps/web/src/features/ideas/idea-list/idea-list-view.tsx`:

```ts
import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';

useSetAgentContext({
  capabilities: [], // hints only; not a security filter
  data: {
    ideas: listedProposals.map((proposal) => ({
      id: proposal.id,
      status: proposal.status,
      title: proposal.title
    }))
  },
  description: 'Summarize open trip ideas across the group and help decide what to review next.',
  key: 'ideas:list',
  title: 'Ideas'
});
```

`data` must be JSON-serializable (`AgentContextData`). The type is
`AgentScreenContext` in `packages/ai/src/ui/context/agent-screen-context.ts`.

## Trip screens

Use `useTripAgentContext(trip, section)` from
`apps/web/src/features/trips/hooks/use-trip-agent-context.ts` instead of
building the object by hand. It sets
`target: { kind: 'trip', section, tripId }`, where `section` is
`'activity' | 'ideas' | 'issues' | 'itinerary' | 'overview' | 'versions'`
(`AssistantTripSection` in `packages/ai/src/runtime/screen`), and passes
`null` while the trip loads so the previous screen's context does not leak.
Do the same (`useSetAgentContext(entity ? {...} : null)`) on other
entity pages.

## Rules

- Screen data is **not** injected into every model request; the agent calls
  the `getScreenContext` tool when it needs it.
- Page `capabilities` are hints. Tools come from the invoked agent, attached
  entities, and backend-verified access.
- Keep `data` small: ids, titles, statuses the traveler can already see. Do
  not dump entire itineraries.

## Tests

The hook throws outside `AgentContextProvider`, so view tests mock it (see
`add-web-view-test`):

```ts
import { vi } from 'vite-plus/test';

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));
```
