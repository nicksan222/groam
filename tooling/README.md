# Tooling

Choose a folder by asking: **what developer or delivery job does this perform?**

| Folder | Sole responsibility |
| --- | --- |
| `app-actions` | Shared app capability contracts plus backend and Vite+ browser-mode (`src/vitest`) adapters |
| `oxc-config` | Shared Oxlint/Oxfmt policy and the Groam lint plugin (not a package) |
| `deploy` | Release recipes (`just deploy …`) and each hosted environment's public settings |
| `diagrams` | Render the Excalidraw scenes under `docs/` to the SVG files committed beside them |
| `hooks` | Git hooks (Vite+ dispatcher via `vp config`) |
| `patches` | Dependency patches Bun applies on install (`patchedDependencies` in the root `package.json`) |
| `quality` | Repository conventions, agent tooling, and release checks that TypeScript and Oxlint cannot express |
| `seeder` | Seed scenarios, fixtures, plans, batching, composition, and CLI |
| `typescript-config` | Importable TypeScript bases |
| `vitest-config` | Importable Vite+ test (Vitest) bases |

Use the root `Justfile` for human-invoked workflows. Package scripts remain the
small, composable commands consumed by `vp run`, CI, npm lifecycle hooks, and the
Just recipes.

All coding harnesses use these commands and the shared `AGENTS.md` guidance.
Skills and role prompts have their canonical source in `.agents/`; native
adapters route there. See [shared agent tooling](../.agents/README.md) for
configuration, runtime detection, discovery fallbacks, and validation. The dev
container supplies the reproducible toolchain; personal provider settings stay
in local/user configuration.

Configuration implementations belong here, including `fallow.config.jsonc` and
`syncpack.config.json`. A file stays at the repository root only when its tool
requires root discovery (`package.json`, `bun.lock`, `convex.json`,
`tsconfig.json`, `vite.config.ts`, `skills-lock.json`, `.mcp.json`, and
`AGENTS.md` and its small provider entry points) or when it
is an entry point (`README.md`, `LICENSE`, `Justfile`). Prefer a tool's
`package.json` key over a root config file: React Doctor reads `reactDoctor`
there (Oxlint owns hooks and accessibility, `one-component-per-file` owns file
size, and Fallow owns dead code, so those React Doctor rules are off). Community
health files live in `.github/`.

Before adding a folder, prefer extending the matching owner above. Create a new
folder only for a distinct lifecycle or external tool; do not create generic
`scripts`, `utils`, or `config` buckets.
