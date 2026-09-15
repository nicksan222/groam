---
name: use-package-aliases
description: >-
  Import Groam code through package aliases instead of parent-directory paths.
  Use when adding imports, moving files, or when lint:conventions reports
  parent-imports, ui-imports, ai-imports, or halo-imports.
---

# Use package aliases

`../` parent imports fail `bun run lint:conventions`. Folders and source files
must be kebab-case.

## From where

| You are in | Use |
| --- | --- |
| `apps/web` | `@/features/...`, `@/lib/...`, `@groam/ui/...`, `@groam/ai-contracts/...`, `@groam/backend/...`, `@groam/env/...` |
| `packages/ui` | `#tsx/*` (TSX), `#src/*` (TS) |
| `packages/backend/convex` | `#convex/...`, `#convex-generated/...` |
| `packages/backend` runtime helpers | `#backend/...` |
| `packages/backend` tests | `#testing/...`, `#convex-generated/api` |
| `packages/env` | `#src/...` |

Apps never import `#src/*`, `#tsx/*`, `#backend/*`, or `#convex/*` — those are package-private.

## UI and AI from apps

```ts
import { Button } from '@groam/ui/components/button';
import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
```

The specifier must match a `package.json` `exports` key. If the file is new,
add the export first.

## Route files

`apps/web/src/routes/*` may import only `@/features`, `@/lib`,
`@tanstack/react-router`, or `@groam/*` (except `@groam/ui` — features import
UI). Do not import other route files.

## Do not

- `@halo/` leftover aliases.
- `@groam/ui/src/...` or deep `#src/*` / `#tsx/*` from outside `packages/ui`.
- `.mjs` for repo-owned modules.
