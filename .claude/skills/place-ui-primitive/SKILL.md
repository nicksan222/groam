---
name: place-ui-primitive
description: >-
  Decide where a reusable Groam UI primitive belongs and how to export it from
  packages/ui. Use when adding a button, dialog, shell piece, hook, or any
  component meant to be shared across features or apps.
---

# Place a UI primitive

Reusable look-and-feel lives in `packages/ui`. Product screens do not.

## Where the file goes

| Kind | Path | Import |
| --- | --- | --- |
| Component | `packages/ui/src/components/<kebab>.tsx` | `@groam/ui/components/<kebab>` |
| Nested piece | `packages/ui/src/components/<folder>/<kebab>.tsx` | `@groam/ui/components/<folder>/<kebab>` (e.g. `shell/client`) |
| Shared hook | `packages/ui/src/hooks/<kebab>.ts` | `@groam/ui/hooks/<kebab>` |
| className / avatar / layout helper | `packages/ui/src/lib/<kebab>.ts` | `@groam/ui/lib/<kebab>` |

Inside `packages/ui`, import `.tsx` modules with `#tsx/*` and `.ts` modules
with `#src/*`. `#src/*` does not resolve TSX; using it for a component fails
`vp run lint:conventions` (`ui-internal-imports`).

## Publish it

1. Add the kebab-case file. Style with semantic tokens (`use-semantic-colors`).
2. Add an explicit key to `packages/ui/package.json` `exports` (no wildcards):

```json
"./components/decision-card": "./src/components/decision-card.tsx"
```

3. Consumers import the published subpath:

```ts
import { DecisionCard } from '@groam/ui/components/decision-card';
```

Importing an unexported subpath, `@groam/ui/src/...`, or `../` into
`packages/ui` fails `vp run lint:conventions` (`ui-imports`,
`parent-imports`); an export pointing at a missing file fails `export-targets`.

## Do not put here

- Trip/idea/issue/chat **views** → `apps/web/src/features/<domain>/` (`place-feature-view`)
- Assistant widget, messages, tool-call cards → `packages/ai/src/ui/` (`place-ai-ui`)
- JSON-render form catalog entries → `packages/ai/src/runtime/output/` (`add-json-render-component`)
