---
name: split-feature-tsx
description: >-
  Split Groam feature TSX so each file exports one component and stays under
  300 lines. Use when a view is growing, lint:conventions reports
  component-files, or a file exports two React components.
---

# Split a feature TSX file

`bun run lint:conventions` owns **file** size (`MAX_COMPONENT_FILE_LINES` =
300) for `apps/web` and `packages/ui/src/ai` TSX. Biome owns **function** size
(250 lines). Do not add a third limit.

## Rules

- One exported component per file (`export function Foo`, `export const Foo =`).
- Unnamed defaults (`export default memo(Foo)`) are ignored by the checker;
  still prefer a named export.
- Filename is kebab-case matching the component: `IdeaEmptyState` →
  `idea-empty-state.tsx`.
- Colocate tests as `<name>.test.tsx` next to the file.

## How to split

1. Extract a sibling file in the same feature folder (or a subfolder if several
   pieces share a prefix, e.g. `trip-versions/`).
2. Keep the page-level `*-view.tsx` as the composer.
3. Move hooks already extracted into `hooks/`; do not leave `useFoo` in a
   300-line view "for convenience".
4. Re-run `bun run lint:conventions`.

## Example

`idea-list-view.tsx` composes `IdeaEmptyState`, `IdeaList`, and
`CreateTripIdeaDialog` — it does not inline those trees.

## Not in scope

- Ordinary `packages/ui` primitives are not under the one-component-per-file rule, but
  still keep files focused.
- Test files (`*.test.tsx`) are excluded from the component-file check.
