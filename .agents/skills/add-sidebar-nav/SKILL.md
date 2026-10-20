---
name: add-sidebar-nav
description: >-
  Add a Groam workspace sidebar entry for a new product area. Use when a new
  route should appear in the shell sidebar (primary list or Settings footer),
  including collapsible nested lists like trips, ideas, issues, or chats.
---

# Add a sidebar nav

Start at `apps/web/src/features/workspace/workspace-shell/workspace-sidebar.tsx`
and `apps/web/src/features/workspace/workspace-sidebar/sidebar-nav.ts` to discover
how domain navs, static navigation, and mobile navigation currently compose.

- For a flat link, inspect `apps/web/src/features/agents/agents-sidebar-nav.tsx`.
  Follow its router wrapper, active-state helper, icon-rail tooltip, mobile-sheet
  closing behavior, and shared test id (`add-test-id`).
- For nested navigation, inspect
  `apps/web/src/features/issues/issues-sidebar-nav.tsx` and the workspace hooks.
  Reuse collapsible, paging, ordering, and page-size helpers. Load through a domain
  hook and skip fetching while closed; do not duplicate pagination constants.
- Keep each domain nav in its feature area and mount it in the existing shell.
  Include it in mobile navigation only when the product flow calls for it.
- When extending a static navigation registry, trace its renderer and test-id
  mapping; extend all corresponding typed cases instead of assuming known ids.
- Follow the neighboring sidebar tests and run the relevant web view checks.

Do not put fetching in the shell or create another workspace-wide context for
section open state.
