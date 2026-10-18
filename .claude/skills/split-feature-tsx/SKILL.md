---
name: split-feature-tsx
description: >-
  Split Groam feature TSX so each file exports one component and stays under
  300 lines. Use when a view is growing, lint reports component-files or
  groam/max-lines, or a file exports two React components.
---

# Split a feature TSX file

Three limits, each owned by one check. Do not add a fourth.

| Limit | Scope | Check |
| --- | --- | --- |
| One exported component per file | `.tsx` in `apps/web` and `packages/ai/src/ui` | `vp run lint:conventions` (`component-files`) |
| 300 lines per file | `.ts`/`.tsx` in `apps/web/src/features` | oxlint `groam/max-lines` |
| 250 lines per function | every `.tsx` | oxlint `groam/max-lines-per-function` |

Tests (`*.test.tsx`, `*.spec.tsx`) are excluded. Run both with `vp run lint`.

## Rules

- Count `export function Foo`, `export const Foo =`, and `export class Foo`.
  Unnamed defaults (`export default memo(Foo)`) are ignored; prefer a named
  export anyway.
- Name the file after the component in kebab-case: `IdeaEmptyState` →
  `idea-empty-state.tsx`.
- Colocate the test as `<name>.test.tsx`.

## How to split

1. Extract a sibling file in the same area folder, or a subfolder when several
   pieces share a prefix (e.g. `trips/trip-versions/`).
2. Keep the page-level `*-view.tsx` as the composer; import siblings with `./`.
3. Move state and Convex calls into `hooks/use-*.ts` (see `add-feature-hook`);
   do not leave `useFoo` inside a long view "for convenience".
4. Re-run `vp run lint`.

## Example

`apps/web/src/features/ideas/idea-list/idea-list-view.tsx` composes
`IdeaEmptyState` (`./idea-empty-state`), `IdeaList` (`./idea-list`), and
`CreateTripIdeaDialog` (`@/features/trips/trip-ideas/create-trip-idea-dialog`)
instead of inlining their trees.

`packages/ui` primitives are outside these file-level checks; still keep them
focused (see `place-ui-primitive`).
