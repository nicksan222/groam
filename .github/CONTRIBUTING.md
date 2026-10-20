# Contributing to Groam

Groam is a collaborative group travel planner. You can run it fully locally
(anonymous Convex + Vite) without a Convex Cloud account.

## Development environment

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/nicksan222/groam?quickstart=1)

The checked-in [dev container](../.devcontainer/devcontainer.json) is the source of
truth for Bun, Node.js, editor extensions, and
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
before `git commit --no-verify`; this avoids launching the Git hooks' repository tools
on the host. The launcher delegates to the official CLI and makes external Git
worktree metadata available inside the container. If your terminal is already inside the dev container or a
Codespace, use the shorter commands shown below directly.

## Local development

```bash
just dev
```

That starts the Convex API on `:3210`, the Vite app on `:5173`, and the Convex
dashboard on `:6790`. Set `CONVEX_AGENT_MODE=anonymous` for every `convex` /
`vp exec convex` command so the CLI never prompts for a cloud login.

While the backend is running, seed demo data:

```bash
just seed
```

Then sign in as the demo owner `demo@groam.example` / `GroamDemo123!`.
Re-seed anytime with `just seed` (the local backend must be running). Seed
workflows live in `@groam/app-actions/backend`.

## Checks

Run the CI gate before opening a pull request:

```bash
just check
```

`just check` covers audit, typecheck, lint, unit tests, React Doctor, and
Fallow. CI also runs the browser journeys (`just journeys`, below), which
`just check` does not run.

Smaller loops:

| Command          | What it does                                                                  |
| ---------------- | ----------------------------------------------------------------------------- |
| `just lint`      | Conventions, Claude harness, syncpack, `vp check`                             |
| `just typecheck` | TypeScript                                                                    |
| `just test`      | Unit and view tests                                                           |
| `just journeys`  | Browser journeys against the running local backend (start it with `just dev`) |

## Search the code graph

Graphify is preinstalled and indexed in the dev container. It parses code
locally with no API key, external database, or hosted service:

```bash
just graphify-explain assertPlanner      # definition and direct neighbors
just graphify-affected assertPlanner     # who calls or imports it
just graphify-path assertMutable isTripAdmin
just graphify-query "trip access planner" # matches identifiers, not prose
```

Run `just graphify-refresh` after changing source files. The generated
`graphify-out/` directory is intentionally local and ignored by Git.
Graphify and its isolated Python environment are part of the container image;
nothing is installed into the host or the Bun workspace.

Do not hand-edit `apps/web/src/routeTree.gen.ts`. Add routes as files under
`apps/web/src/routes` and run `just codegen`.

## Conventions

- Import through package aliases (`@groam/ui`, `@groam/app-actions`, `@/features/…`),
  never parent `../` paths across packages
- Semantic color tokens only (no hex / rgb / Tailwind gradients in features)
- Public Convex functions live under `packages/backend/convex/routes` as
  `export const run`
- Environment variables go through `@groam/env/*` or Convex `defineApp({ env })`

Agent-oriented layout notes live in [`AGENTS.md`](../AGENTS.md).

## AI-assisted development

Start with [`AGENTS.md`](../AGENTS.md), the shared repository instructions for
any coding harness. Skills live in [`.agents/skills`](../.agents/skills), and
subagent role instructions in [`.agents/roles`](../.agents/roles). Discover the
current descriptions there rather than maintaining a separate roster.

Claude and Codex have native adapters generated from that single source.
Claude skill folders link to the shared collection. Claude, Gemini, and Copilot
instruction files symlink to `AGENTS.md`; other harnesses can read it explicitly.
Where native discovery or delegation is unavailable, load the matching skill
or role file directly and follow the documented capability fallback.

Use `just sync-agents` after adding skills or changing role metadata.
`vp run lint:agents` runs in the normal lint/CI gate and checks metadata,
source/command references, local links, native adapter drift, MCP settings,
and container pins. It permits other harness configuration. These structural
checks complement source review; they cannot prove prose is semantically fresh.

The dev container includes the optional Claude launcher at
[`tooling/claude/claude.sh`](../tooling/claude/claude.sh), with Headroom compression
when available. Other harnesses use the same project commands without that
launcher. Keep model choices, routing, credentials, permissions, and personal
plugins in user/local configuration. Shared roles inherit the invoking
session's models; they never assume a provider's model aliases.

Project MCP definitions are in [`.mcp.json`](../.mcp.json). Import them through
your harness's supported setup if it uses another format, and authorize them
locally. Neither MCP nor optional plugins are required for code search.
See [shared tooling maintenance](../.agents/README.md) for adapter details,
upstream updates, source discovery, and portability limits.

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
License ([`LICENSE`](../LICENSE)).
