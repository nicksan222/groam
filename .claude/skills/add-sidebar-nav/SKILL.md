---
name: add-sidebar-nav
description: >-
  Add a Groam workspace sidebar section for a new product area. Use when a
  new route should appear under Workspace or Manage in the shell, including
  nested trip/chat/issue lists.
---

# Add a sidebar nav

The shell is `apps/web/src/features/workspace/workspace-shell.tsx`. It
composes per-domain nav components; it does not inline list rows.

## Simple item

Add an entry to `primaryNavigation` or `manageNavigation` in the shell (href,
label, icon). Use `NavigationItem`.

## Nested list (trips, ideas, issues, chats, agents)

1. Create `apps/web/src/features/<domain>/<domain>-sidebar-nav.tsx`.
2. Build rows with `@groam/ui/components/sidebar` (`SidebarMenuButton`,
   `SidebarMenuItem`) and `@groam/ui/hooks/use-sidebar`.
3. Active state: `navigationItemIsActive` from
   `@/features/workspace/sidebar-nav`.
4. Nested recency lists: `orderSidebarItems` and `SIDEBAR_NESTED_PAGE_SIZE`
   from `@/features/workspace/sidebar-nested-nav`, plus
   `SidebarNestedLoadMore` / `SidebarCollapsibleItem`.
5. Mount it in `WorkspaceSidebar` next to the other domain navs.
6. Put `data-testid={testIds.nav...}` on the section link (`add-test-id`).

## Rules

- Keep collapsible open state in
  `@/features/workspace/hooks/use-sidebar-section-open`, not in a new
  workspace-wide context.
- Fetch list data through the domain feature hook, not inside the shell.
- Icon-collapsed (rail) layout must still work — copy an existing nav such as
  `inbox-sidebar-nav.tsx` or `agents-sidebar-nav.tsx`.
