---
name: register-agent-screen-context
description: >-
  Register useSetAgentContext on a Groam product page so the assistant knows
  title, purpose, visible data, and capabilities. Use when adding or changing
  a workspace page, trip section, or any screen the compact assistant can see.
---

# Register agent screen context

Register context from the feature view, not its route. Read
`packages/ai/src/ui/context/agent-context.tsx` and `agent-screen-context.ts` for
the current hook and serialized data contract. Find a comparable view using
`useSetAgentContext` rather than copying a fixed object shape.

- For trip pages, reuse
  `apps/web/src/features/trips/hooks/use-trip-agent-context.ts`. Discover valid
  target kinds/sections in `packages/ai/src/runtime/screen/`; do not maintain an
  enum list in this skill or hand-build what the helper already supplies.
- Clear context while an entity is unavailable, following the hook's current
  null/cleanup handling, so context from the previous screen does not leak.
- Keep data small and JSON-serializable: relevant ids, titles, and visible state,
  not entire itineraries. Match the page's actual purpose and available data.
- Context capabilities are hints, never authorization. The agent fetches screen
  context through its tool; backend access checks still decide what it may do.

Read `apps/web/src/features/assistant/agent-context-coverage.test.ts` for route
coverage and layout exemptions. View tests should follow existing context mocks
or provider setup (`add-web-view-test`) and verify the relevant page behavior.
