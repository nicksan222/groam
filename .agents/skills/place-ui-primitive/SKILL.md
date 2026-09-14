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
| Nested piece | `packages/ui/src/components/<folder>/<kebab>.tsx` | matching export subpath |
| Shared hook | `packages/ui/src/hooks/<kebab>.ts` | `@groam/ui/hooks/<kebab>` |
| className / avatar helper | `packages/ui/src/lib/<kebab>.ts` | `@groam/ui/lib/<kebab>` |

Inside this package: `#tsx/*` for `.tsx` modules, `#src/*` for `.ts`. The
`#src/*` map does not resolve TSX.

## Publish it

1. Add the file (kebab-case).
2. Add an explicit export in `packages/ui/package.json` `exports`. Wildcards
   are not used for components; a missing export fails `bun run lint:conventions`.
3. Apps import the published subpath. Never `../` into `packages/ui`, and never
   `@groam/ui/src/...`.

```json
"./components/decision-card": "./src/components/decision-card.tsx"
```

```ts
import { DecisionCard } from '@groam/ui/components/decision-card';
```

## Do not put here

- Trip/issue/chat **views** → `apps/web/src/features/<domain>/`
- Assistant chat widget, messages, tool-call cards → `packages/ui/src/ai/`
- JSON-render form catalog entries → `packages/ai-contracts/src/output/`
