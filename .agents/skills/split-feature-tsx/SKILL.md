---
name: split-feature-tsx
description: >-
  Split Groam feature TSX into focused components when a view grows, lint reports
  component-files or groam/max-lines, or a file exports multiple components.
---

# Split a feature TSX file

Read the active configuration under `tooling/oxc-config/` and the
`component-files` check under `tooling/quality/` for current size limits, scopes,
and exclusions. Treat those checks as the source of truth instead of copying
numeric limits into guidance.

- Export one named component per file and use its kebab-case name for the file.
  Extract siblings within the same feature area; group related pieces when
  the existing directory structure calls for it.
- Keep the page-level view as the composer and colocate component tests.
- Move shared state and Convex access into the domain's tested hooks when that
  creates a useful boundary (`add-feature-hook`); keep simple local state local.
- Import siblings with `./` and other areas through package/app aliases
  (`use-package-aliases`).
- Run the current lint commands from the root manifest and the affected tests.
  Preserve behavior and loading/context boundaries during extraction; do not
  split into arbitrary fragments solely to move line counts around.
