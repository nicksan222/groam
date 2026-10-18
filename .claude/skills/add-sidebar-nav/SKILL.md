---
name: add-sidebar-nav
description: >-
  Add a Groam workspace sidebar entry for a new product area. Use when a new
  route should appear in the shell sidebar (primary list or Settings footer),
  including collapsible nested lists like trips, ideas, issues, or chats.
---

# Add a sidebar nav

`WorkspaceSidebar` in
`apps/web/src/features/workspace/workspace-shell/workspace-sidebar.tsx`
composes one `<Domain>SidebarNav` per product area; it never inlines list
rows. Static entries live in
`apps/web/src/features/workspace/workspace-sidebar/sidebar-nav.ts`
(`primaryNavigation`, `manageNavigation`, `mobileNavigation`).

## Flat link (copy `agents/agents-sidebar-nav.tsx`)

1. Create `apps/web/src/features/<domain>/<domain>-sidebar-nav.tsx` exporting
   one component.
2. Render `SidebarMenuItem` > `SidebarMenuButton asChild` (from
   `@groam/ui/components/sidebar`) wrapping `Link` from
   `@/features/workspace/navigation/router`, with an icon, a label, and
   `tooltip` so the icon rail still works.
3. Active state: `navigationItemIsActive(pathname, '/<domain>')` from
   `@/features/workspace/workspace-sidebar/sidebar-nav`. Close the mobile
   sheet with `useSidebar().setOpenMobile(false)` on click.
4. Put `data-testid={testIds.nav<Domain>}` on the link (`add-test-id`).
5. Mount it in `WorkspaceSidebar`'s primary `SidebarMenu` beside the other
   domain navs. Add it to `mobileNavigation` only if it belongs in the
   mobile tab bar.

## Nested list (copy `issues/issues-sidebar-nav.tsx`)

- Wrap in `SidebarCollapsibleItem` (`@groam/ui/components/sidebar-collapsible-item`)
  and page with `SidebarNestedLoadMore`
  (`@groam/ui/components/sidebar-nested-load-more`).
- Open state: `useSidebarSectionOpen('<domain>')`; paging:
  `useSidebarNestedVisible` + `useSidebarNestedPaging` — all in
  `@/features/workspace/hooks/`.
- Fetch with the domain feature hook (`add-feature-hook`), passing `'skip'`
  while the section is closed and `SIDEBAR_NESTED_PAGE_SIZE` from
  `@/features/workspace/workspace-sidebar/sidebar-nested-nav` otherwise.
  Use `orderSidebarItems` there for favorites/recency order.

## Rules

- Do not add an entry to `manageNavigation` without updating
  `NavigationItem`'s test-id mapping — it only knows `navHome` and
  `navSettings`.
- No new workspace-wide context for open state; no data fetching in the
  shell.
- Cover the nav with a colocated `<domain>-sidebar-nav.test.tsx`
  (`add-web-view-test`).
