---
name: add-feature-hook
description: >-
  Add a Convex query, mutation, or action hook under apps/web/src/features.
  Use when wiring client async state, useQuery/useMutation/useAction, or
  paginated lists into the web app — keep high-churn dialog state out of
  stable workspace data.
---

# Add a feature hook

Reusable client state belongs in `apps/web/src/features/<domain>/hooks/` with a
colocated test. Inspect nearby hooks before introducing another query wrapper.

- Read `apps/web/src/features/agents/hooks/use-agent.ts` and the relevant route
  definitions for current query, pagination, and missing-id handling. Skip
  requests while required ids are unavailable; preserve loading/error semantics.
- Import public API through `@groam/backend/api`. Derive shared inputs and
  outputs from generated function types, following `apps/web/src/types/`, rather
  than maintaining handwritten copies.
- Keep stable workspace/trip data in domain hooks and high-churn dialog or
  selection state local or in a dedicated context. Workspace providers must not
  rerender unrelated pages for transient UI changes.
- Extract a shared hook when multiple views repeat a query. A one-off read may
  stay inline when extraction adds no useful boundary.
- View tests mock the hook (`add-web-view-test`); test the hook's own behavior in
  its colocated test. Discover commands and test projects from the web manifest
  and Vite config.
