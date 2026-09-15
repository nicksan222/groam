---
name: register-agent-screen-context
description: >-
  Register useSetAgentContext on a Groam product page so the assistant knows
  title, purpose, visible data, and capabilities. Use when adding or changing
  a workspace page, trip section, or any screen the compact assistant can see.
---

# Register agent screen context

Every product page must call `useSetAgentContext` from
`@groam/ui/ai/context/agent-context`. A route coverage test fails when a new
page omits it.

Call it in the **feature view**, not the route file.

## Shape

```ts
import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';

useSetAgentContext({
  capabilities: [], // informational; not a security filter
  data: { /* JSON-serializable snapshot of what the traveler sees */ },
  description: 'What this screen is for, in one sentence.',
  key: 'ideas:list',
  title: 'Ideas'
});
```

Trip screens also set `target`:

```ts
target: { kind: 'trip', section: 'overview', tripId: trip._id }
```

`section` is `'activity' | 'issues' | 'itinerary' | 'overview' | 'versions'`.
Pass `null` while the entity is loading so the previous screen does not leak.

Shared trip wiring lives in
`apps/web/src/features/trips/hooks/use-trip-agent-context.ts` — reuse it
instead of copying.

## Rules

- Screen data is **not** injected into every model request. The agent calls
  `getScreenContext` when it needs it.
- `capabilities` on the page are hints. Tools are selected from the invoked
  agent, attached entities, and backend-verified access.
- Keep `data` small: ids, titles, statuses the traveler can already see. Do
  not dump entire itineraries.

In tests, mock the hook:

```ts
vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));
```
