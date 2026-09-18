# Contributing to Groam

Groam is a collaborative group travel planner. You can run it fully locally
(anonymous Convex + Vite, or the desktop app) without a Convex Cloud account.

## Development environment

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/nicksan222/groam?quickstart=1)

The checked-in [dev container](.devcontainer/devcontainer.json) is the source of
truth for Bun, Node.js, Rust, native desktop libraries, editor extensions, and
forwarded ports. Use GitHub Codespaces, or open the repository locally and choose
**Dev Containers: Reopen in Container**. Its post-create step installs the locked
workspace and builds a local Graphify code index automatically.

From a host terminal, create or start the environment with the Dev Container
CLI, then run repository commands through it:

```bash
.devcontainer/devcontainer up
.devcontainer/devcontainer exec just check
```

Apart from Git and the `devcontainer` command itself, do not run repository
tooling on the host. On a clean host, run the containerized `just check` gate
before `git commit --no-verify`; this avoids launching Husky's repository tools
on the host. The launcher delegates to the official CLI and makes external Git
worktree metadata available inside the container. If your terminal is already inside the dev container or a
Codespace, use the shorter commands shown below directly.

## Local development

```bash
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

## Search the code graph

Graphify is preinstalled and indexed in the dev container. It parses code
locally with no API key, external database, or hosted service:

```bash
just graphify-query "how does workspace authorization reach Convex routes?"
just graphify-explain "workspaceQuery"
just graphify-path "workspaceQuery" "AgentRuns"
```

Run `just graphify-refresh` after changing source files. The generated
`graphify-out/` directory is intentionally local and ignored by Git.

From a host terminal, prefix the same commands with the Dev Container CLI:

```bash
.devcontainer/devcontainer exec just graphify-query "how does authentication work?"
```

Graphify and its isolated Python environment are part of the container image;
nothing is installed into the host or the Bun workspace.

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
