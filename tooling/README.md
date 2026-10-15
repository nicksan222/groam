# Tooling

Choose a folder by asking: **what developer or delivery job does this perform?**

| Folder | Sole responsibility |
| --- | --- |
| `app-actions` | Shared app capability contracts plus backend and Playwright adapters |
| `claude` | Claude Code launcher (`claude.sh`), shared plugin settings, and MCP servers |
| `oxc-config` | Shared Oxlint/Oxfmt policy and the Groam lint plugin (not a package) |
| `devkit` | Reusable local-process, readiness, and local auth/environment helpers |
| `graphify` | Exclude patterns for the local Graphify code index (`just graphify-refresh`) |
| `hooks` | Git hooks (Vite+ dispatcher via `vp config`) |
| `quality` | Groam-specific architecture and convention checks |
| `seeder` | Seed scenarios, fixtures, plans, batching, composition, and CLI |
| `showcase` | Record and render product walkthroughs using Playwright app actions |
| `typescript-config` | Importable TypeScript bases |
| `vitest-config` | Importable Vite+ test (Vitest) bases |

Use the root `Justfile` for human-invoked workflows. Package scripts remain the
small, composable commands consumed by `vp run`, CI, npm lifecycle hooks, and the
Just recipes.

Claude Code, the only supported agent harness, uses these recipes inside the
checked-in dev container; there is no separate host or cloud-agent toolchain
lifecycle to keep synchronized. Personal overrides such as
`tooling/claude/mcp.local.json` are ignored by Git.

Configuration implementations belong here, including `fallow.config.jsonc` and
`syncpack.config.json`. A file stays at the repository root only when its tool
requires root discovery (`package.json`, `bun.lock`, `convex.json`,
`doctor.config.ts`, `tsconfig.json`, `vite.config.ts`, `skills-lock.json`, and
`CLAUDE.md`, whose Convex section `convex ai-files` rewrites in place) or when it
is an entry point (`README.md`, `LICENSE`, `Justfile`). Community health files
live in `.github/`.

Before adding a folder, prefer extending the matching owner above. Create a new
folder only for a distinct lifecycle or external tool; do not create generic
`scripts`, `utils`, or `config` buckets.
