---
name: add-env-variable
description: >-
  Add a validated Groam environment variable through @groam/env or the Convex
  defineApp env. Use when introducing a new env var, Vite VITE_* key, seeder
  or tooling setting, or Convex deployment secret — never read process.env or
  import.meta.env in app code.
---

# Add an environment variable

App code imports a typed, Envalid-validated target. Raw `process.env` /
`import.meta.env` is allowed only inside `packages/env` and env bootstrap
scripts.

## Client / Node / tooling targets

1. Add the Envalid field to the matching `packages/env/src/apps/<target>.ts`
   (with a `default` or `desc`).
2. Expose it as a camelCase key on that file's exported `env` object.
3. Import it: `import { env } from '@groam/env/<target>';`.

| Target | Used by | Examples |
| --- | --- | --- |
| `web-client` | `apps/web` (extends `auth-client`) | `VITE_SITE_URL`, `VITE_GROAM_SHELL`, `VITE_MAP_TILES_URL` |
| `auth-client` | auth client | `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` |
| `web` | web build | `STATIC_HOSTING_BASE_PATH` |
| `convex-tooling` | `tooling/devkit` | AI keys synced to Convex, `GROAM_READY_TIMEOUT_SECONDS` |
| `runtime` | installed-app runtime | `GROAM_CONVEX_URL`, `GROAM_DATA_DIR` |
| `desktop-tooling` | `apps/desktop/scripts` | `VITE_PHOTON_URL`, `CI` |
| `seeder` | `tooling/seeder` | `SEED_CONVEX_URL`, `SEED_USER_EMAIL` |
| `journeys` | browser journeys (`apps/web/e2e`) | `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` |
| `showcase` | `tooling/showcase` | `SHOWCASE_*` |
| `vitest` | `tooling/vitest-config` | `CI` |

A new target also needs `./<target>` in `packages/env/package.json`
`exports`.

## Convex runtime

Deployment secrets go on `defineApp({ env: { … } })` in
`packages/backend/convex/convex.config.ts`:

```ts
MY_FEATURE_KEY: v.optional(v.string()),
```

Read them from the generated `env` (`import { env } from
'#convex-generated/server'`) inside Convex functions — never from
`@groam/env/*` or `process.env`.

To sync the value from `.env.local` on `just dev`, also add it to
`configuredConvexEnvironment` in `packages/env/src/apps/convex-tooling.ts`
(`tooling/devkit/sync-ai-env.ts` pushes that map). One-off set against the
local backend: `vp exec convex env set NAME value`.

## Do not

- Read `import.meta.env.VITE_*` in `apps/web` or `packages/ui`.
- Put LLM keys in client env; they stay Convex-side or in Settings → AI.
