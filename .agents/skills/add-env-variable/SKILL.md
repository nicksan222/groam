---
name: add-env-variable
description: >-
  Add a validated Groam environment variable through @groam/env or Convex
  defineApp env. Use when introducing a new env var, Vite VITE_* key, seeder
  setting, or Convex dashboard secret — never process.env or import.meta.env
  in app code.
---

# Add an environment variable

Application code imports a typed target. Raw `process.env` / `import.meta.env`
is allowed only inside `packages/env` and env bootstrap scripts.

## Client / Node targets

1. Add the Envalid field to the matching file under `packages/env/src/apps/`.
2. Re-export a camelCase name on `env`.
3. Import `import { env } from '@groam/env/<target>'`.

| Target | Typical variables |
| --- | --- |
| `web-client` | `VITE_CONVEX_URL`, `VITE_SITE_URL`, `VITE_GROAM_SHELL` |
| `auth-client` | `VITE_CONVEX_URL` |
| `playwright` | `PLAYWRIGHT_BASE_URL`, seed credentials |
| `seeder` | `SEED_*` URLs and demo login |
| `runtime` | local Convex process flags |
| `web` | `STATIC_HOSTING_BASE_PATH` |

If the target is new, add `./<target>` to `packages/env/package.json` `exports`.

## Convex runtime

Dashboard / deployment secrets go on `defineApp({ env })` in
`packages/backend/convex/convex.config.ts`. Read them from the generated
`env` in Convex functions — not from `@groam/env/*` and not from
`process.env`.

```ts
// convex.config.ts
AI_MODEL: v.optional(v.string()),
```

Local `.env.local` values sync to Convex during `bun run dev`. For one-off
sets: `CONVEX_AGENT_MODE=anonymous bunx convex env set NAME value`.

## Do not

- Read `import.meta.env.VITE_*` in `apps/web` or `packages/ui`.
- Put LLM keys in client env; they stay Convex-side or in Settings → AI.
