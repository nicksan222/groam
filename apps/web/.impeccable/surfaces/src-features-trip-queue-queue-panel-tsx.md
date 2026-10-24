---
version: 1
slug: "src-features-trip-queue-queue-panel-tsx"
primary_target: "src/features/trip-queue/queue-panel.tsx"
related_targets: ["src/features/trip-queue/queue-list.tsx","src/features/trip-queue/queue-row.tsx"]
---

# Trip queues (Ideas, Issues, Polls)

Scope: the three trip queues, one design. Mode: Operate. Users: organizers triaging many items, travelers checking what waits on them.

## Direction contract

THESIS: The queue is a keyboard-first ledger: dense full-width rows you scan and triage at speed, not a stack of bordered cards. Refuses the rounded bordered list of padded two-line rows.

OWN-WORLD: Graphite tokens unchanged. Full-bleed 44px rows on the page background, hairline separators at border/60, collapsible group header bars on the secondary surface, a 2px primary bar for the keyboard cursor, a tinted primary wash for selected rows, a floating popover-surface batch bar, kbd hints in input-bordered keycaps.

STORY: The viewer sees what is theirs at the top, reads each item's status, title, excerpt, due and owner on one line, moves with J/K, opens with Enter, selects with X and changes several issues at once; C adds a question inline.

FIRST VIEWPORT: Shared page header; toolbar with search (/ focuses), the Open/Yours/Settled segmented control, and on Issues Mandatory and Assignee filter chips at the right. Below, edge to edge: "Your turn · N" group bar, rows (status icon, #id, title + muted excerpt, flag, idea chip, due, assignee avatar, age), then "Waiting on others · N", then an "Add a question for the group…" row. Desktop footer of shortcut hints; batch bar floats above it when rows are selected.

FORM: Keyboard ledger, dealt candidate 4 of 7; seed key f327f38f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Chosen comp (critique reference): .impeccable/mocks/queues/c-ledger.comp.png (HTML source c-ledger.html).
Deferred (needs backend data): agent live activity line, list-level done-when met, poll voter dots.
