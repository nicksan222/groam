# Environment package

Centralized Envalid schemas for every Groam runtime. Application code imports a
typed target instead of reading environment globals directly.

```ts
import { env } from '@groam/env/auth-client';
import { env } from '@groam/env/web-client';
import { env } from '@groam/env/playwright';
import { env } from '@groam/env/seeder';
```

| Target           | Variables                                                                        |
| ---------------- | -------------------------------------------------------------------------------- |
| `auth-client`    | `VITE_CONVEX_URL`, optional `VITE_CONVEX_SITE_URL`                               |
| `web`            | `STATIC_HOSTING_BASE_PATH`                                                       |
| `web-client`     | `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `VITE_SITE_URL`, Vite `BASE_URL`, `VITE_GROAM_SHELL` (`web` or `desktop`; default `web`), optional `VITE_PHOTON_URL` (default Photon), optional `VITE_MAP_TILES_URL` (CARTO Voyager template) |
| `runtime`        | `CONVEX_AGENT_MODE`, `GROAM_CONVEX_URL`, `GROAM_DATA_DIR`, `GROAM_REPLACE_CONVEX_DIR`, `GROAM_SITE_ORIGIN`, `GROAM_STARTUP_TIMEOUT_MS` |
| `desktop-tooling` | `CI`, `CONVEX_AGENT_MODE`, `VITE_MAP_TILES_URL`, `VITE_PHOTON_URL` for desktop build and development scripts |
| `playwright`     | `PLAYWRIGHT_BASE_URL` (defaults to `VITE_CONVEX_SITE_URL` / Convex site `3211` for CI), `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`. Local dev against Vite: `bun run test:e2e:local` (`http://localhost:5173`, must match `VITE_SITE_URL`). |
| `seeder`         | `SEED_CONVEX_URL`, `SEED_SITE_URL`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` |

`process.env` and `import.meta.env` access is restricted by the root Biome
configuration and permitted only inside this package and environment bootstrap
scripts. Convex runtime variables remain declared with `defineApp({ env })` and
read from its generated `env` object, as required by Convex.

`web-client` also exposes `env.shell`, `env.isWeb`, and `env.isDesktop`. The
shell is baked at build time with `VITE_GROAM_SHELL`: Convex Cloud and local
Vite default to `web`; the Tauri runtime upload sets `desktop`.

Better Auth’s `BETTER_AUTH_SECRET` and Convex `SITE_URL` are configured by
`tooling/devkit/configure-auth.ts` during local startup, not by this package.
