---
name: add-web-route
description: >-
  Add a TanStack Router product route under apps/web/src/routes. Use when
  creating a new page, URL, nested workspace section, or file-based route —
  never by editing routeTree.gen.ts by hand.
---

# Add a web route

Routes are flat files in `apps/web/src/routes/`. `routeTree.gen.ts` is
generated; never hand-edit it or add a central registry.

## File name

Workspace pages use the `_workspace.` prefix to share the authenticated
shell. Dots are path segments, `$name` is a param, `.index` is the leaf
under a layout file.

| URL | File |
| --- | --- |
| `/issues` | `_workspace.issues.index.tsx` |
| `/issues/$issueId` | `_workspace.issues.$issueId.tsx` |
| `/agents/$agentId` (under layout `_workspace.agents.$agentId.tsx`) | `_workspace.agents.$agentId.index.tsx` |
| `/trips/$tripId/ideas/$proposalId/$view` | `_workspace.trips.$tripId.ideas.$proposalId.$view.tsx` |

The Vite router plugin regenerates the tree while `just dev` / `just web`
runs; otherwise run `vp run codegen:routes`.

## Route body

Only compose a feature view (`place-feature-view`). `vp run lint:conventions`
(`route-imports`) allows `@tanstack/react-router`, `@/features/*`, `@/lib/*`,
`@groam/ai/ui/*`, and `@groam/*` packages except `@groam/ui`.

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { AgentDetailView } from '@/features/agents/agent-detail/agent-detail-view';

export const Route = createFileRoute('/_workspace/agents/$agentId/')({
  component: AgentDetailPage
});

function AgentDetailPage() {
  const { agentId } = Route.useParams();
  return <AgentDetailView agentId={agentId} />;
}
```

Pass params into the view. No Convex calls, dialogs, or inline markup here.

## Then, in the feature view

- Call `useSetAgentContext` (`register-agent-screen-context`);
  `apps/web/src/features/assistant/agent-context-coverage.test.ts` fails
  without it.
- Define loading UI in the view or a composed child — a persistent shell
  driven by `isLoading` / `showLoading` / `useReadyValue`
  (`@/lib/use-ready-value`) or `role="status"` skeletons, not a swapped
  `*Loading` tree. `apps/web/src/features/assistant/loading-state-coverage.test.ts`
  checks every route that renders a `@/features` view; layouts, outlets,
  and redirects are skipped.
- Add a sidebar entry if needed (`add-sidebar-nav`).
