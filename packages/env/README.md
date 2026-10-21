# Environment package

Centralized Envalid schemas for every Groam runtime. Application code imports a
typed target instead of reading environment globals directly.

```ts
import { env } from '@groam/env/auth-client';
import { env } from '@groam/env/web-client';
import { env } from '@groam/env/journeys';
import { env } from '@groam/env/seeder';
```

| Target           | Variables                                                                        |
| ---------------- | -------------------------------------------------------------------------------- |
| `auth-client`    | `VITE_CONVEX_URL`, optional `VITE_CONVEX_SITE_URL`                               |
| `web`            | `WEB_BASE_PATH`                                                       |
| `web-client`     | `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `VITE_SITE_URL`, Vite `BASE_URL`, optional `VITE_PHOTON_URL` (default Photon), optional `VITE_MAP_TILES_URL` (OpenStreetMap raster template) |
| `journeys`       | `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` (local backend the per-file journey accounts are created on; defaults to the local Convex ports). |
| `seeder`         | `SEED_CONVEX_URL`, `SEED_SITE_URL`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` |
| `convex-tooling` | `CONVEX_AGENT_MODE` (default `anonymous`), `VITE_CONVEX_URL`, `GROAM_READY_TIMEOUT_SECONDS`, `GROAM_STARTUP_TIMEOUT_MS` (both default `0`) |
| `vitest`         | `CI` (exposed as `isCI`) |

`src/apps/node-env-flags.ts` is not a target: it adds `isDev`, `isProduction`,
and `isTest` flags derived from `NODE_ENV` to a target (the seeder uses it).

`process.env` and `import.meta.env` access is restricted by the root lint
configuration and permitted only inside this package and environment bootstrap
scripts. Convex runtime variables remain declared with `defineApp({ env })` and
read from its generated `env` object, as required by Convex.

Better Auth’s `BETTER_AUTH_SECRET` and Convex `SITE_URL` are configured by
`tooling/devkit/configure-auth.ts` during local startup, not by this package.
