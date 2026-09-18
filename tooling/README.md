# Tooling

Choose a folder by asking: **what developer or delivery job does this perform?**

| Folder | Sole responsibility |
| --- | --- |
| `app-actions` | Shared app capability contracts plus backend and Playwright adapters |
| `biome-config` | Shared Biome policy and Grit plugins (not a package) |
| `devkit` | Reusable local-process, readiness, and local auth/environment helpers |
| `husky` | Git hooks |
| `quality` | Groam-specific architecture and convention checks |
| `seeder` | Seed scenarios, fixtures, plans, batching, composition, and CLI |
| `showcase` | Record and render product walkthroughs using Playwright app actions |
| `typescript-config` | Importable TypeScript bases |
| `vitest-config` | Importable Vitest bases |

Use the root `Justfile` for human-invoked workflows. Package scripts remain the
small, composable commands consumed by Turbo, CI, npm lifecycle hooks, and the
Just recipes.

All agents use these recipes inside the checked-in dev container; there is no
separate host or cloud-agent toolchain lifecycle to keep synchronized.

Configuration implementations belong here, including `fallow.config.jsonc` and
`syncpack.config.json`. A file stays at the repository root only when its tool
requires root discovery (`biome.json`, `convex.json`, `doctor.config.ts`,
`package.json`, `tsconfig.json`, `turbo.json`) or when it is the developer entry
point (`Justfile`).

Before adding a folder, prefer extending the matching owner above. Create a new
folder only for a distinct lifecycle or external tool; do not create generic
`scripts`, `utils`, or `config` buckets.
