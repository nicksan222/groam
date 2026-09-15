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

- `PageBody` owns page gutters and the Overview spacing by default: 16/24/32px
  horizontal padding, 20/24px above content, and 64/80px below content.
  Use one page body around tab content. Do not add another inside a tab.
- `TwoColumns` owns the grid: a flexible primary column and a 20rem supporting
  column at `xl`, with a 24px gap growing to 32px. Below `xl` the columns stack
  in reading order.
- Both columns provide 20px between their children. The right column is sticky
  at `xl` with a 24px offset. Widths, gaps, breakpoints, order and spacing are
  intentionally not configurable on the named column API.
- `Shell` owns the soft page canvas in both themes, independent of tab content.
  Headers retain their raised background. The scaffold inherits this page surface. Use `Shell.Card` and `Shell.Section`
  for consistent child surfaces and headings rather than adding page backgrounds,
  another width container, or custom card borders and radii.
- Normal HTML attributes and semantic `as` tags are supported. Label landmarks.
- Exactly one `LeftColumn` followed by one `RightColumn` is required. Fragments
  are supported; put feature components and skeletons inside the named slots.

## Loading

Keep the named slots and replace only their contents. The layout stays identical.
Use `aria-busy` and a single loading label for the region.

```tsx
<Shell.TwoColumns aria-busy={isLoading || undefined}>
  <Shell.LeftColumn>
    {isLoading ? <ReportSkeleton /> : <Report />}
  </Shell.LeftColumn>
  <Shell.RightColumn aria-label="Details">
    {isLoading ? <DetailsSkeleton /> : <Details />}
  </Shell.RightColumn>
</Shell.TwoColumns>
```

## Guardrails

TypeScript and Biome reject layout props, custom styles/classes and spread props
on named columns. Runtime checks reject missing, duplicate, reversed, wrapped or
orphan columns. The deprecated `Shell.Split` API remains only for compatibility
inside UI; Biome blocks it in application code.

For trip and idea pages, Biome also keeps `TripPageShell` as the sole owner of
`Shell.PageBody` and rejects layout overrides on that body. Tab views provide
content directly, so they cannot accidentally add a second layer of page padding.
Other page families can still use their existing page-body variants. Biome also
rejects generic descendant `has-data-[variant=…]` selectors: scope these to a
component `data-slot` so an inset content card cannot restyle the sidebar or page.

The real Biome fixtures in `tooling/quality/shell-biome.test.ts`, shared component
tests and the idea tab browser test cover this contract. These run through the
existing repository checks. Intentional tooling edits and explicit suppression
comments remain reviewable escape hatches.
