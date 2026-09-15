---
name: place-feature-view
description: >-
  Place product UI in apps/web/src/features rather than routes or packages/ui.
  Use when adding a page, panel, dialog, list, or domain-specific
  React view for trips, issues, chats, agents, settings, or group.
---

# Place a feature view

Product screens live under `apps/web/src/features/<domain>/`. Route files only
compose them.

## Layout

```
apps/web/src/features/<domain>/
  <name>-view.tsx          # page-level view the route renders
  <name>-dialog.tsx        # one exported component per file
  hooks/use-<name>.ts      # Convex queries/mutations
  <name>.test.tsx
```

Existing domains: `agents`, `auth`, `dashboard`, `discussions`, `group`,
`ideas`, `inbox`, `invitations`, `issues`, `media`, `settings`, `trips`,
`workspace`. Add a new kebab-case folder only for a new product area.

## Rules

- Export at most **one** component per TSX file.
- Stay under **300 lines**. Split extras into sibling kebab-case files.
- Import primitives from `@groam/ui/components/*`, assistant chrome from
  `@groam/ui/ai/*`, Convex from `@groam/backend/api`.
- Cross-feature imports use `@/features/<other>/...`, not `../../`.
- Tiny non-UI helpers used by several features go in `apps/web/src/lib/`.

## Not here

| Need | Put it |
| --- | --- |
| Shared button/dialog shell | `packages/ui` |
| Assistant widget / message bubble | `packages/ui/src/ai` |
| TanStack route | `apps/web/src/routes` (compose only) |
