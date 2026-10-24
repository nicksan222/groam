---
name: register-agent-screen-context
description: >-
  Register useSetAgentContext on a Groam product page so the assistant knows
  title, purpose, visible data, and capabilities. Use when adding or changing
  a workspace page, trip section, or any screen the compact assistant can see.
---

# Register agent screen context

Every workspace page tells Groam AI what it shows, and Oxlint enforces it
(`tooling/oxc-config/plugin/rules/`, fixtures in `agent-context.test.ts`):

- `groam/page-renders-view`: a page under `apps/web/pages/(workspace)/` renders
  a feature `*View` imported from a `*-view` module, or only redirects with an
  imported `<Navigate>`. Layouts are exempt; page files may not import the hook.
- `groam/view-registers-agent-context`: a `*-view.tsx` file exports its `*View`
  and calls `useSetAgentContext` (or a `use*AgentContext` hook) exactly once,
  in one of its top-level components (the view, or a local component behind a
  gate or error boundary).
- `groam/agent-context-owner`: no registration anywhere else (layouts, child
  components, other hooks), each `use*AgentContext` hook registers exactly
  once, and only pages render a `*View`. A shared piece that is not a page is
  not named `*View`.

Read `packages/ai/src/ui/context/agent-context.tsx` and `agent-screen-context.ts`
for the current hook and serialized data contract. Find a comparable view using
`useSetAgentContext` rather than copying a fixed object shape.

- A page with no AI actions still registers: `capabilities: []`, and a
  description that says there is nothing to act on (see the idea waypoint
  `idea-detail-view.tsx` or the chat inbox `chat-inbox-view.tsx`).
- Pass `null` while the page has nothing to describe yet (loading, gated, not
  found). The view stays the same screen when it loads, so an open assistant
  stays open. Do not register stale data from the previous page.
- When the data lives deeper in the tree, lift it to the view (read the same
  query in the view; Convex shares the subscription) rather than registering in
  a child. Data that may fail to load is read without throwing (see
  `use-trips-turn.ts`) so the view can still register.
- For trip pages, reuse
  `apps/web/src/features/trips/hooks/use-trip-agent-context.ts`. Discover valid
  target kinds/sections in `packages/ai/src/runtime/screen/`; do not maintain an
  enum list in this skill or hand-build what the helper already supplies.
- Keep data small and JSON-serializable: relevant ids, titles, and visible state,
  not entire itineraries. Match the page's actual purpose and available data.
- Context capabilities are hints, never authorization. The agent fetches screen
  context through its tool; backend access checks still decide what it may do.

View tests mock `@groam/ai/ui/context/agent-context` and assert the registered
context with the view's states (`add-web-view-test`).
