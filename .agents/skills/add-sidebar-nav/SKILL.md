---
name: add-sidebar-nav
description: >-
  Add a Groam workspace sidebar entry for a new product area. Use when a new
  route should appear in the shell sidebar (group links, the current trip's
  sections, or the Settings footer).
---

# Add a sidebar nav

The sidebar has three parts and nothing else. Start at
`apps/web/src/features/workspace/workspace-shell/workspace-sidebar.tsx` and
`apps/web/src/features/workspace/workspace-sidebar/sidebar-nav.ts`.

- **Header:** Search only. The group switcher lives at the bottom of the trip switcher menu (a "Group: {name}" submenu) and in Settings › Group.
- **Content:** the trip block only
  (`apps/web/src/features/trips/trip-switcher/trip-sidebar-block.tsx`): the trip
  switcher card, then the current trip's sections in reading order: Plan,
  Board, Calendar, Ideas, Issues, Polls, Packing, Research, Chat, Activity, People.
  Group-level destinations (Trips, Ideas, Issues, Agents) are not sidebar links:
  "All trips" lives in the switcher menu, and agents are participants, not a
  destination (their runs show on the item they work, in Chat, and in Activity).
  Chat has two homes: trip chats are
  the trip's Chat section; chats with no trip are the footer's Chats row. Do not add nested or
  collapsible lists, paging, or create dialogs to the sidebar.
- **Footer (the account):** Home, Inbox and Chats (each with an unread badge), Settings, then the account menu.

Adding a trip section (Board is the second: the whole trip as lanes (plan, ideas, issues by status), no count; People is the last: roster, seats, group invites; it has no count): add it to `tripTabSections` and `tripSectionConfig`
(`apps/web/src/features/trips/trip-sections.ts`, the one place for its label, icon,
description, `fill`/`padded` layout, and its one header creation button with an optional label),
then render its
body in `active-trip-section.tsx`. The sidebar rows share one test id
(`sidebarTripSection`) and carry `data-section`, so the journeys' `openTripSection`
needs no new sidebar id (give the section a page marker in `open-trips.ts` for it to wait on). Counts come from `useTripSectionCounts` and render only when the
number exists and is above zero; each section says what its count means in the
row's accessible name. The current trip comes from `useCurrentTrip` (route trip,
else the short id remembered per user and group by `useRememberTrip`, which the
trip page mounts).

The command palette (`command-palette-results.ts`) is trip-scoped and builds its Go to group from `tripSectionConfig`, so a new trip section appears there with the sidebar's label and icon without extra wiring; a footer link does not appear in the palette unless you add it there on purpose.

Adding a footer link: add a `SidebarNavItem` (with its own `testId`) in
`sidebar-nav.ts` and render it with `NavigationItem`. For a link with a badge,
inspect `apps/web/src/features/inbox/inbox-sidebar-nav.tsx` or `apps/web/src/features/discussions/chats-sidebar-nav.tsx` and use
`SidebarMenuBadge`, whose default style is the count pill (a dot in the icon rail).

There is one navigation system: below `md` the same sidebar opens as a sheet from the top app bar (`mobile-top-bar.tsx`: menu button, current trip or page title, assistant sparkle). Do not add a bottom bar or a second section strip.

Give every item a shared test id (`add-test-id`). Do not put fetching in the
shell beyond `useCurrentTrip` and the trip list, and do not create another
workspace-wide context for sidebar state. Follow the neighboring sidebar tests
and run the relevant web view checks.
