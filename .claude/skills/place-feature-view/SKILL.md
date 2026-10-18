---
name: place-feature-view
description: >-
  Place product UI in apps/web/src/features rather than routes or packages/ui.
  Use when adding a page, panel, dialog, list, or domain-specific React view
  for trips, ideas, issues, chats, agents, settings, or group.
---

# Place a feature view

Product screens live under `apps/web/src/features/<domain>/`. Route files only
compose them (`add-web-route`).

## Layout

Group each screen in a kebab-case area folder; keep hooks in the domain's
`hooks/`:

```
apps/web/src/features/ideas/
  idea-list/
    idea-list-view.tsx        # page-level view the route renders
    idea-list-view.test.tsx
    idea-empty-state.tsx      # one exported component per file
    idea-list.tsx
  hooks/
    use-workspace-ideas.ts    # Convex queries/mutations (add-feature-hook)
    use-workspace-ideas.test.ts
```

Existing domains: `agents`, `assistant`, `auth`, `dashboard`, `discussions`,
`errors`, `group`, `ideas`, `inbox`, `issues`, `media`, `settings`, `trips`,
`workspace`. Add a new kebab-case folder only for a new product area.

## Rules

- One exported component per TSX file; files under `features/` stay under
  **300 lines** (see `split-feature-tsx`).
- Page views call `useSetAgentContext` (see `register-agent-screen-context`).
- Import primitives from `@groam/ui/components/*`, assistant chrome from
  published `@groam/ai/ui/*` subpaths, Convex from `@groam/backend/api`.
- Siblings import with `./`; anything further uses `@/features/<domain>/...`
  or `@/lib/...`, never `../` (see `use-package-aliases`).
- Feature hooks in `hooks/use-*.ts` need a colocated `use-*.test.ts(x)`.
- Small non-UI helpers shared by several features go in `apps/web/src/lib/`.

## Not here

| Need | Put it |
| --- | --- |
| Shared button/dialog/shell | `packages/ui` (`place-ui-primitive`) |
| Assistant widget / message bubble | `packages/ai/src/ui` (`place-ai-ui`) |
| TanStack route | `apps/web/src/routes` (compose only) |
