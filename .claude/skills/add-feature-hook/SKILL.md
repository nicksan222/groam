---
name: add-feature-hook
description: >-
  Add a Convex query, mutation, or action hook under apps/web/src/features.
  Use when wiring client async state, useQuery/useMutation/useAction, or
  paginated lists into the web app — keep high-churn dialog state out of
  stable workspace data.
---

# Add a feature hook

Reusable Convex client state lives in
`apps/web/src/features/<domain>/hooks/use-<kebab>.ts`, with a colocated
`use-<kebab>.test.ts(x)`. Views consume hooks; they call `useQuery` inline
only for a truly one-off read.

## Hook

Call `api.routes.<domain>.<operation>.run` from `@groam/backend/api` and pass
`'skip'` while ids are missing (from `features/agents/hooks/use-agent.ts`):

```ts
import type { AssistantAgentId } from '@groam/ai/agents';
import { api } from '@groam/backend/api';
import { usePaginatedQuery, useQuery } from 'convex/react';

export function useAgent(agentId: AssistantAgentId | undefined) {
  const agent = useQuery(api.routes.agents.get.run, agentId ? { agentId } : 'skip');
  const { loadMore, results, status } = usePaginatedQuery(
    api.routes.agents.runs.list.run,
    agentId ? { agentId } : 'skip',
    { initialNumItems: 20 }
  );
  return { agent: agent ?? undefined, loadMore, runs: results, status };
}
```

## Types

Derive shared shapes in `apps/web/src/types/<domain>.ts` from the route, not
hand-copied interfaces:

```ts
import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type AgentRun = FunctionReturnType<typeof api.routes.agents.runs.list.run>['page'][number];
```

Use `FunctionArgs<typeof api.routes.….run>` for inputs.

## Split state

| State | Where |
| --- | --- |
| Stable workspace/trip data | domain `hooks/` |
| Dialogs, selection, ephemeral UI | a dedicated context or local view state |

Never put high-churn dialog open/selection into the workspace provider — it
rerenders unrelated pages.

## Do not

- Import `api` from `#convex-generated` in the web app; use
  `@groam/backend/api`.
- Duplicate the same `useQuery` in two views — extract the hook.
- Hit Convex from view tests; mock the hook (`add-web-view-test`).
