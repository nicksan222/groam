---
name: add-feature-hook
description: >-
  Add a Convex query, mutation, or action hook under apps/web/src/features.
  Use when wiring client async state, useQuery/useMutation/useAction, or
  paginated lists — keep high-churn dialogs out of stable workspace data.
---

# Add a feature hook

Reusable Convex client state lives in `apps/web/src/features/<domain>/hooks/`.
Views consume hooks; they do not call `useQuery` inline unless the call is
truly one-off and unused elsewhere.

## File

`apps/web/src/features/<domain>/hooks/use-<kebab>.ts`

Call `api.routes.<domain>.<operation>.run` from `@groam/backend/api`. Skip
when ids are missing:

```ts
import { api } from '@groam/backend/api';
import { usePaginatedQuery, useQuery } from 'convex/react';
import type { AssistantAgentId } from '@groam/ai-contracts/agents/registry';

export function useAgent(agentId: AssistantAgentId | undefined) {
  const agent = useQuery(api.routes.agents.get.run, agentId ? { agentId } : 'skip');
  const runs = usePaginatedQuery(
    api.routes.agents.runs.list.run,
    agentId ? { agentId } : 'skip',
    { initialNumItems: 20 }
  );
  return { agent: agent ?? undefined, loadMore: runs.loadMore, runs: runs.results };
}
```

Derive input/output types from `FunctionArgs` / `FunctionReturnType` of the
`run` function, not from hand-copied shapes.

## Split context

| State | Where |
| --- | --- |
| Stable workspace/trip data | domain `hooks/` |
| Dialogs, selection, ephemeral UI | a dedicated context or local view state |

Do not put high-churn dialog open/selection into the workspace provider — it
rerenders unrelated pages.

## Do not

- Import `api` from `#convex-generated` in the web app; use `@groam/backend/api`.
- Duplicate the same `useQuery` in two views — extract the hook instead.
