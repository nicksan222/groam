# Packages

Pick the owner by asking one question: **what kind of code is this?**

```text
@groam/ai-contracts  ←  @groam/backend  ←  apps/web
        ↑                    ↑
 shared AI meaning     Convex execution

@groam/ui  ←  apps/web      primitives + assistant UI

@groam/env   validated configuration
@groam/auth  Better Auth configuration
@groam/ui    product-agnostic React primitives
```

| Code | Owner |
| --- | --- |
| Agent identity, prompt policy, capability id, run DTO, generated-output schema | `ai-contracts` |
| Convex route, database access, provider adapter, executable agent tool | `backend` |
| Assistant hook, chat widget, message, tool card, AI styles | `ui/src/ai` |
| Button, dialog, table, theme token, reusable UI primitive | `ui` |
| Validated environment value | `env` |
| Authentication configuration | `auth` |
| Shared app action contract, stable test id, backend adapter, browser adapter | `tooling/app-actions` |
| Playwright configuration and app journeys | `apps/web/e2e` |

Dependencies point left in the diagram. `backend` never imports `ui`, and
`ai-contracts` never imports either runtime. `bun run lint:conventions` enforces
these boundaries.

For the exact three-step AI extension recipes, open [`ai-contracts/README.md`](./ai-contracts/README.md).
