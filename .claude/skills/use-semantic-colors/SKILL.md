---
name: use-semantic-colors
description: >-
  Use Groam semantic color tokens instead of hex, rgb, or gradients. Use when
  styling UI, adding Tailwind classes, theming, or when lint:conventions
  reports hardcoded-colors or gradients.
---

# Use semantic colors

Tokens live in `packages/ui/src/styles/tokens.css`: values in `:root` (light)
and `.dark`, Tailwind color names in the `@theme` block (`--color-<name>`).
Everything else references those names.

## In classNames

```tsx
<div className="border-border bg-card text-card-foreground">
  <p className="text-muted-foreground">3 open ideas</p>
  <span className="bg-success text-success-foreground">Applied</span>
</div>
```

Available families: `background`, `canvas`, `foreground`, `card`, `popover`,
`primary`, `secondary` (+ `secondary-hover`), `muted`, `accent`,
`destructive`, `info`, `success`, `warning`, `border`, `input`, `ring`,
`scrim`, `chart-1..5`, `sidebar-*`, `code`, and `avatar-*`, each with a
`-foreground` pair where relevant.

Do not write `bg-[#285542]`, `text-gray-500`, `bg-gradient-to-r`, or
`linear-gradient(...)`.

## When a token is missing

1. Add the value in `tokens.css` under both `:root` and `.dark`.
2. Map it in the `@theme` block: `--color-<name>: var(--<name>);`. Without this
   step, `bg-<name>` generates no CSS.
3. Use the new utility. Never add a one-off color in a component.

## Do not

- Gradients: `linear-|radial-|conic-gradient(`, `bg-gradient-*`, `bg-linear-*`.
- Raw `#hex`, `rgb()`, `hsl()`, `oklch()`, `lab()`, `color()` anywhere outside
  `packages/ui/src/styles/tokens.css` and `globals.css` (includes TS, TSX,
  and other CSS files).
- `!important` in stylesheets (`important-styles`).

`vp run lint:conventions` fails on hardcoded colors or gradients outside the
two token files. For broader visual work, use the `impeccable` skill.
