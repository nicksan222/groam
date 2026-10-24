# Page layout defaults

Import Shell from `@groam/ui/components/shell/client`. A page grid has one design;
features provide content and accessible labels, not layout configuration.

```tsx
<Shell.PageBody>
  <Shell.TwoColumns>
    <Shell.LeftColumn>
      <Report />
      <Activity />
    </Shell.LeftColumn>
    <Shell.RightColumn aria-label="Details">
      <Details />
    </Shell.RightColumn>
  </Shell.TwoColumns>
</Shell.PageBody>
```

- `PageBody` is the one body under every page header. `padded` (default) owns the
  16/24px gutters, a 1600px max width, 24/32px rhythm between blocks and 32px
  below; `clearNav` clears the phone bottom nav. `bleed` fills the pane for
  Calendar and chat and content aligns itself with `SHELL_BLEED_INSET`.
  It never adds top padding: the header owns the 24px gap. Use one page body
  around tab content. Do not add another inside a tab, and pass no spacing classes.
- `TwoColumns` owns the grid: a flexible primary column and a 20rem supporting
  column at `xl`, with a 24px gap growing to 32px. Below `xl` the columns stack
  in reading order.
- Both columns provide 20px between their children. The right column is sticky
  at `xl` with a 24px offset. Widths, gaps, breakpoints, order and spacing are
  intentionally not configurable on the named column API.
- `Shell` owns the soft page canvas in both themes, independent of tab content.
  The page header has no background of its own; it is part of this surface. The scaffold inherits this page surface. Use `Shell.Card` and `Shell.Section`
  for consistent child surfaces and headings rather than adding page backgrounds,
  another width container, or custom card borders and radii.
- Normal HTML attributes and semantic `as` tags are supported. Label landmarks.
- Exactly one `LeftColumn` followed by one `RightColumn` is required. Fragments
  are supported; put feature components inside the named slots.

## Loading

While data loads render `PageLoading` (`@groam/ui/components/page-loading`) in place of the
slot or page content; never draw a skeleton.

## Guardrails

TypeScript and the Groam lint rules reject layout props, custom styles/classes and spread props
on named columns. Runtime checks reject missing, duplicate, reversed, wrapped or
orphan columns.

For trip and idea pages, the lint rules also keep `TripPageShell` as the sole owner of
`Shell.PageBody` and reject layout overrides on that body. Tab views provide
content directly, so they cannot accidentally add a second layer of page padding.
The lint rules
also reject generic descendant `has-data-[variant=…]` selectors: scope these to a
component `data-slot` so an inset content card cannot restyle the sidebar or page.

The real lint fixtures in `tooling/oxc-config/layout.test.ts`, shared component
tests and the idea tab browser test cover this contract. These run through the
existing repository checks. Intentional tooling edits and explicit suppression
comments remain reviewable escape hatches.

## Page header

Every page uses `Shell.Header` (one primitive, `components/header/index.tsx`) with the slots
`parent`, `title`, `status`, `lead`, `actions`, `meta`, and `notice`; `titleProps` carries test ids and
`data-*` for the title. While data loads render `PageLoading`; never draw a skeleton. Never draw a custom page
header. The title row's height from `md` comes from `SHELL_HEADER_ROW` (derived from the sidebar
trip switcher in `shell-layout.ts`).

## Page actions

A header's `actions` are `Shell.Action` elements (`icon`, `label`, `tone`), never a bare `Button`
(a lint rule enforces it in features). Each is one element in two forms: from `md` an ordinary
labelled button in the title row (`primary` is the filled default button, `secondary` the outline
one; `iconOnly` keeps a menu trigger or copy link icon-only; `desktopIcon`/`desktopIconEnd` give
the desktop a different or trailing icon; `pending` shows a spinner), and below `md` a round
icon-only button in the action dock: `Shell.Header` renders `actions` in
`data-slot="shell-header-actions"`, a fixed vertical stack at the bottom-right (`SHELL_DOCK`) in the
order the page passes them. Pass the secondary actions first and the page's one primary last, so it
is lowest, under the thumb. The label stays the accessible name and tooltip. The `lead` slot never
reaches the dock. No actions renders no dock. The dock hides while a text field has focus
(`workspace.css`). Pages clear it: `SHELL_PAGE_BOTTOM` (padded) and `SHELL_PANE_BOTTOM_NAV` (a bleed
page's scroller); a page that ends in a pinned composer sets `dockLift` on `Shell.BannerLayout`
(`--shell-dock-lift`, `SHELL_DOCK_LIFT_COMPOSER`) so the dock floats above it.
