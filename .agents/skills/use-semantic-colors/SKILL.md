---
name: use-semantic-colors
description: >-
  Use Groam semantic color tokens instead of hex, rgb, or Tailwind gradients.
  Use when styling UI, adding Tailwind classes, theming, or when conventions
  lint reports hardcoded-colors or gradients.
---

# Use semantic colors

Tokens live in `packages/ui/src/styles/tokens.css` (`:root` and `.dark`).
Everywhere else references those names.

## In classNames

Use Tailwind semantic utilities:

- `bg-background`, `bg-card`, `bg-primary`, `bg-muted`, `bg-destructive`
- `text-foreground`, `text-muted-foreground`, `text-primary-foreground`
- `border-border`, `border-sidebar-border`
- `ring-ring`, hover variants like `bg-primary-hover`

Do not write `bg-[#65a30d]`, `text-gray-500`, `bg-gradient-to-r`, or
`linear-gradient(...)`.

## When a token is missing

Add it once in `tokens.css` (light + dark) and use the new name. Do not
introduce a one-off hex in a component. Hex is allowed only in
`packages/ui/src/styles/tokens.css` and `globals.css`.

## Do not

- Gradients (`linear-gradient`, `bg-gradient-*`, `bg-linear-*`).
- Raw `rgb()`, `hsl()`, `oklch()` in feature or primitive classNames.
- Copying primary green (`#65a30d`) into a feature file.

`bun run lint:conventions` fails the PR if it finds hardcoded colors or
gradients outside the token files.
