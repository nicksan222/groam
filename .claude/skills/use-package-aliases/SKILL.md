---
name: use-package-aliases
description: >-
  Import Groam code through package aliases instead of parent-directory paths.
  Use when adding imports, moving files, or when lint:conventions reports
  parent-imports, ui-imports, ai-imports, route-imports, or halo-imports.
---

# Use package aliases

`../` imports fail `vp run lint:conventions` (`parent-imports`). Same-folder
`./sibling` imports are fine. Folders and source files must be kebab-case.

## From where

| You are in | Use |
| --- | --- |
| `apps/web` | `@/features/...`, `@/lib/...`, `@groam/ui/...`, `@groam/ai/...`, `@groam/backend/...`, `@groam/env/...` |
| `packages/ui` | `#tsx/*` (TSX), `#src/*` (TS only) |
| `packages/ai` | `#ai/*` (TS and TSX) |
| `packages/backend/convex` | `#convex/...`, `#convex-generated/...` |
| `packages/backend` runtime helpers | `#backend/...` |
| `packages/backend` tests | `#testing/...`, `#convex-generated/api` |
| `packages/env`, `tooling/app-actions` | `#src/...` |

`#` imports are package-private: other packages and apps never use them.

## From apps

```ts
import { Button } from '@groam/ui/components/button';
import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useWorkspaceIdeas } from '@/features/ideas/hooks/use-workspace-ideas';
```

The specifier must match a `package.json` `exports` key; for a new file add
the export first (`place-ui-primitive`, `place-ai-ui`). `@groam/ui` only
exposes `components/*`, `hooks/*`, `lib/*`, and `styles`.

## Route files

`apps/web/src/routes/*` may import only `@tanstack/react-router`,
`@/features/...`, `@/lib/...`, `@groam/ai`, `@groam/auth`, `@groam/backend`,
and `@groam/env` (`route-imports`). Not `@groam/ui`, not other route files —
features own the UI (`add-web-route`).

## Do not

- Use leftover `@halo/` aliases (`halo-imports`).
- Import `@groam/ui/src/...` or deep `#src/*` / `#tsx/*` from outside
  `packages/ui`.
- Create `.mjs` files for repo-owned modules.
