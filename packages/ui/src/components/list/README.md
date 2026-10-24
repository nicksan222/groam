# List

The one list primitive: `import { List, type ListHint } from '@groam/ui/components/list'`.
Every list of rows in the product (queues, inbox, chats, runs, members, activity, packing) is built
from it. `DataTable` stays separate (tabular, sortable columns).

## Composition

```tsx
<List fill>                                   {/* frame; `fill` grows to the pane's height */}
  <List.Toolbar noun={{ singular: 'issue', plural: 'issues' }} query={q} onQueryChange={setQ}>
    <SegmentedControl … />                    {/* extra filters, optional */}
  </List.Toolbar>
  <List.Body>                                 {/* hairline on top, bleeds out of page padding */}
    <List.Group label="Your turn" count={2} onToggle={fold} collapsed={folded}>
      <List.Row cursor={isCursor} selected={isSelected} attention={yourTurn}>
        <List.Leading><List.Checkbox label="Select X" selected onToggle={…} /></List.Leading>
        <List.Icon><StatusIcon /></List.Icon>
        <List.Main>
          <List.Title asChild muted={settled}><Link …>Title</Link></List.Title>
          <List.Inline>…phone-only facts…</List.Inline>
          <List.Aside>Decide by Oct 3</List.Aside>
          <List.Description>One muted excerpt line</List.Description>
        </List.Main>
        <List.Meta>…flags, chips (wide only)…</List.Meta>
        <List.Avatar><Avatar /></List.Avatar>
        <List.Age><time>2d</time></List.Age>
        <List.Expanded>…opens in place under the title…</List.Expanded>
      </List.Row>
    </List.Group>
    {/* while data loads render <PageLoading label="…" /> in place of the groups */}
    {/* or <List.Empty icon headline description buttonRaw /> (EmptyScreen props) */}
  </List.Body>
  <List.Footer desktopOnly><List.Hints hints={[{ keys: 'J K', label: 'move' }]} /></List.Footer>
</List>
```

Every slot is optional and takes no room when absent. Rows always live in a `List.Group`
(its `<ul>` is the accessible list; rows are `<li>`). A group without `label` renders no bar; give
it `aria-label`. A group with `label` but no `onToggle` is a static header (no chevron); pass `onToggle` only
while folding applies.

| Part | Notes |
| --- | --- |
| `List` | `bleed` (default true) pulls body and footer to the pane edges; `fill` makes the list the pane's flex-1 child so the footer sits at the bottom of a short or empty list. |
| `List.Toolbar` | Search + `children` controls + Clear. `active` = non-search filters narrow the list; `onClear` resets them. |
| `List.Search` | The standard list filter: K opens a dialog styled like the Ctrl+K palette (`open`/`onOpenChange`, shared by the footer trigger and keyboard shortcut). Give it `facets` for `key:value` hints (`examples` fill the empty state, `icon` leads a key's rows, `label` heads its values); recognised words are coloured in the input itself, and a full-width bar shows the active query with them as chips, an optional `count={{ shown, total }}` ("N of M issues", also in the dialog footer), and Clear. Put `List.SearchTrigger` in the footer controls; K opens the same dialog. |
| `List.Sort` | Button opening a dialog with all available orders and the checked current order (`noun`, `options`, `value`, `onValueChange`); `grouped` explains ordering within fixed groups. Features sort their own items. |
| `List.Body` | The hairline-topped content area. Holds groups or `Empty`. |
| `List.Group` | `label`, `count`, `action`, `collapsed`, `onToggle`, `aria-label`. |
| `List.Row` | `cursor` (keyboard cursor), `selected`, `attention` (waiting on viewer), `deferred` (skip layout while off screen; long lists). Spreads div props such as `data-testid`. |
| `List.Leading` | Wide-only first column for `List.Checkbox`; render empty to reserve it. |
| `List.Icon` | Glyph aligned to the title's first line. `media` for a tall picture (chat avatar). |
| `List.Main` / `Title` / `Description` | Text block. `Title asChild` wraps your link or button and stretches over the whole row; `muted` for settled. |
| `List.Inline` / `Aside` | `Inline` shows only on phones (second line); `Aside` is a 112px right-aligned column on wide screens and joins the second line on phones. |
| `List.Meta` / `Avatar` / `Age` | Right edge. `Meta` and `Age` are wide-only; `Avatar` shows on phones too. |
| `List.Actions` | Right-edge controls (buttons, selects) that stay visible on phones; use in place of `Avatar`/`Age`. |
| `List.Expanded` | In-place detail under the title column. |
| `List.Footer` | Sticky bottom bar; `desktopOnly` hides it on phones. `List.Hints` renders key caps (`↑ ↓ ↵` as icons); a hint with `onClick` is a button on a faint pill, gathered at the right, the rest flat text. |

Keyboard J/K navigation, selection state, and collapse state stay in the feature (see
`trip-queue/hooks/use-queue-ledger.ts`); the primitive only renders `cursor`, `selected`, and
`List.Checkbox`. Keep the cursor row findable with your own `data-*` attribute passed to the row.
A `data-slot` set on the child of `List.Title asChild` wins over the primitive's, so a feature hook
can still select its title.

No `className` is needed for layout. If a real difference is missing, add a prop here rather than
overriding in a feature.

## Migration

| Old | New |
| --- | --- |
| `Ledger` | `List` + `List.Body` |
| `LedgerGroup` (`label`, `count`, `collapsed`, `onToggle`, `action`) | `List.Group` (same props; `label` optional) |
| `LedgerRow` (`icon`, `title`, `description`, `leading`, `meta`, `aside`, `avatar`, `age`, `inline`, `expanded`, `cursor`, `selected`, `attention`) | `List.Row` with `List.Icon`, `List.Main` (`Title`, `Description`, `Inline`, `Aside`), `List.Leading`, `List.Meta`, `List.Avatar`, `List.Age`, `List.Expanded` |
| `ledgerTitleClassName` | `<List.Title asChild>` |
| `RecordList` (`query`, `onQueryChange`, `toolbarExtra`, `empty`, `resourceLabel`) | `List` + `List.Toolbar` + `List.Body`; map items yourself. Sorting: keep a feature-side `useMemo`, with `List.Sort` in the toolbar; group with `List.Group`. |
| `RecordListToolbar` | `List.Toolbar` (`filterPlaceholder`→`placeholder`, `resourceLabel`→`noun`, `hasExtraFilters`→`active`, `toolbarExtra`→`children`, `filterTestId`→`testId`) |
| `RecordListItem` (`icon`, `title`, `description`, `metadata`, `badges`, `trailing`) | `List.Row`: `icon`→`List.Icon`, `title`→`List.Title`, `description`→`List.Description`, `metadata`→`List.Meta`, `badges`→`List.Meta`/`List.Inline`, `trailing`→`List.Age`/`List.Avatar` |
| `RecordListBadge` | `Badge variant="outline"` inside `List.Meta` |
| `recordListTitleClassName` | `<List.Title asChild>` |
| hand-rolled `<ul>` of rows | `List.Group` + `List.Row` |
| hand-rolled skeleton rows | `PageLoading` (`@groam/ui/components/page-loading`); never draw a skeleton |
| `EmptyScreen` in a list | `List.Empty` |
| `QueueSelectBox` | `List.Checkbox` in `List.Leading` |
| `QueueShortcutFooter` markup | `List.Footer desktopOnly` + `List.Hints` |

Proof of use: `apps/web/src/features/trip-queue/` (`queue-list.tsx`, `queue-row.tsx`,
`queue-shortcut-footer.tsx`, `queue-panel.tsx`).


## Filtered list pages

Compose `List.Search`, `List.Body` (groups, loading, or empty), then the bottom
bar. On desktop the controls appear only in that bar:

```tsx
<List.Footer desktopOnly>
  <List.Hints desktopOnly hints={navigationHints} />
  <List.Controls>
    <List.Sort noun={noun} options={sortOptions} value={sort} onValueChange={setSort}
      open={sorting.open} onOpenChange={sorting.setOpen} />
    <List.SearchTrigger onClick={openSearch} />
  </List.Controls>
</List.Footer>
```

`List.Controls` groups the buttons at the right; `SearchTrigger` and `Sort` share
one button component, semantic colors, and phone touch targets. `SearchTrigger`
shows a K key cap. Sorting opens the same command-style dialog surface as Filter,
marks the current order, applies a choice immediately, and returns focus to its
button. Keep ordering in the feature; time/title lists share `recordListSorts`.
`List.Hints desktopOnly` hides navigation hints when the pane is narrow. `clearDock`
leaves space for floating phone actions. Use `fill` in a stretching pane to keep
the footer at the bottom even with a short list. `List.Toolbar` remains available
for intentionally inline controls, such as multiple embedded settings lists.

`List.Search` owns the dialog, debounced input, keyboard completion, query chips,
and clear action. Its input paints recognised `key:value` words through a mirror
behind transparent text (colour and a background chip only, so glyphs stay aligned);
hints share one 44px text gutter with the input; the first hint is highlighted from
the start, Tab completes it while a word is started, Enter applies it once the
highlight moved or a word is started and otherwise closes; keys are offered from two
typed letters; a trailing `key:` is neither filter nor text. The parent must store
`onQueryChange` values verbatim (`useDebouncedDraft`). Features define `ListSearchFacet[]`, parse the query with
`parseListSearch(query, facets.map(facet => facet.key))`, and match domain data.
Combine different keys with AND, and repeated values of a key with OR. Unknown
values match no rows. `listSearchPersonSlugs` maps person names to stable filter
values (`listSearchSlug` drops accents, so `Ana Martínez` is `ana-martinez`),
disambiguating duplicate names and reserved words such as `me`.

On phones, `TripListActions` composes actual `Shell.Action` buttons in the existing
header action dock. `useTripListControls` connects its `search` and `sort` requests
to the same dialogs the desktop footer opens. Keep the hidden footer mounted so
the sort dialog remains available through its portal. Both dialogs return focus
to the actual opener, including a shell action when the footer trigger is hidden.
Trip request wiring stays in web features; UI primitives know nothing about trips
or backend records. `List.Sort` also supports uncontrolled use in embedded lists.

Examples: `trip-queue/queue-panel.tsx` (issues, ideas, polls),
`research/research-list/research-list.tsx`, and
`trips/trip-activity/trip-activity-history.tsx`. Ideas offers `status:`, `author:`
and `is:`; research offers `is:unread` and `has:links`; activity offers `person:`
and `action:`. Searching shows settled queue matches even when that group was folded.
