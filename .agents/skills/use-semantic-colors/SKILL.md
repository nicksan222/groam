---
name: use-semantic-colors
description: >-
  Use Groam semantic color tokens instead of hex, rgb, or gradients. Use when
  styling UI, adding Tailwind classes, theming, or when lint:conventions
  reports hardcoded-colors or gradients.
---

# Use semantic colors

Read `packages/ui/src/styles/tokens.css` for current semantic names, light/dark
values, and Tailwind theme mappings. Choose tokens by meaning rather than
copying a remembered palette or adding one-off component colors.

- Use semantic utilities for background, foreground, border, state, and chart
  roles. Check that the corresponding mapping actually exists before using it.
- When a semantic role is missing, add its values for both themes and its theme
  mapping in the token source, following nearby definitions.
- Do not introduce arbitrary color literals, raw palette utilities, gradients,
  or stylesheet `!important`. Read the active color/style checks under
  `tooling/quality/` for current scope and token-file exemptions.
- Run the relevant convention checks and inspect both light and dark rendering
  when changing tokens. Use the available frontend design skill for broader
  interface work when it is relevant.
