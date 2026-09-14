# Contributing to Groam

Groam is a collaborative group travel planner. You can run it fully locally
(anonymous Convex + Vite, or the desktop app) without a Convex Cloud account.

## Prerequisites

- [Bun](https://bun.sh) `1.3.11` (see `packageManager` in the root `package.json`)
- [Node.js](https://nodejs.org) `24` (see `convex.json`; required for Convex Node actions)
- [just](https://just.systems) for the repository's developer command surface

On Debian, Ubuntu, or WSL, desktop builds also need:

```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

## Local development

```bash
just install
just dev
```

That starts the Convex API on `:3210`, the Vite app on `:5173`, and the Convex
dashboard on `:6790`. Set `CONVEX_AGENT_MODE=anonymous` for every `convex` /
`bunx convex` command so the CLI never prompts for a cloud login.

While the backend is running, seed demo data:

```bash
just seed
```

Then sign in as the demo owner `demo@groam.example` / `GroamDemo123!`.
Re-seed anytime with `just seed` (the local backend must be running). Seed
workflows live in `@groam/app-actions/backend`.

Desktop (Tauri wrapping the same app):

```bash
just desktop
```

## Checks

Run what CI runs before opening a pull request:

```bash
just check
```

Smaller loops:

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `just lint`      | Conventions, syncpack, Biome       |
| `just typecheck` | TypeScript                         |
| `just test`      | Unit tests                         |
| `just e2e-local` | Playwright against Vite on `:5173` |

Do not hand-edit `apps/web/src/routeTree.gen.ts`. Add routes as files under
`apps/web/src/routes` and run `just codegen`.

## Conventions

- Import through package aliases (`@groam/ui`, `@groam/ai-contracts`, `@/features/…`),
  never parent `../` paths across packages
- Semantic color tokens only (no hex / rgb / Tailwind gradients in features)
- Public Convex functions live under `packages/backend/convex/routes` as
  `export const run`
- Environment variables go through `@groam/env/*` or Convex `defineApp({ env })`

Agent-oriented layout notes live in [`AGENTS.md`](AGENTS.md).

## Proposing changes

Search [existing issues](https://github.com/nicksan222/groam/issues) before
starting work. For a substantial change, open a feature request first so the
approach can be discussed before implementation.

Keep pull requests focused, explain the motivation and validation performed,
and link any related issue. Add tests for behavior changes and update docs when
commands, setup, or user-facing behavior changes. All contributions must follow
the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the MIT
License ([`LICENSE`](LICENSE)).
