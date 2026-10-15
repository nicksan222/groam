---
name: graphify
description: Use for questions about Groam's architecture, symbols, call paths, ownership, or cross-file code relationships.
---

# Graphify for Groam

Use the repository's pinned, code-only Graphify installation. It lives only in
the dev-container image and needs no API key or external database.

## Execution boundary

When already inside the dev container or Codespaces, run the `just` commands
below directly. From any host environment, including the Codex app, start the
container and use the Dev Container CLI:

```bash
.devcontainer/devcontainer up
.devcontainer/devcontainer exec just graphify-query "<question>"
```

The repository launcher delegates to the official Dev Container CLI and makes
external Git worktree metadata available inside the container.

Never install Graphify, Python, `uv`, or repository dependencies on the host.
Never install tools ad hoc in a running container. If the CLI or graph is
missing, rebuild from the checked-in definition:

```bash
.devcontainer/devcontainer rebuild
.devcontainer/devcontainer exec just graphify-refresh
```

If Docker or `devcontainer` is unavailable, stop and ask the user to enable it.
Do not use host runtimes or an inline Python fallback. Do not install Graphify
Git hooks; this repository uses Husky.

## Search workflow

For architecture, ownership, call-flow, or cross-file questions, query the
graph before opening source files:

```bash
just graphify-query "how does workspace authorization reach Convex routes?"
just graphify-explain "workspaceQuery"
just graphify-path "workspaceQuery" "AgentRuns"
```

Each query recipe refreshes the code-only graph first. Follow the returned
source locations, inspect the relevant files, and verify conclusions against
the code. Use containerized `rg` for exact strings or when Graphify finds no
useful match. Run `just graphify-refresh` explicitly after a large edit when a
query is not otherwise needed.

The generated graph is private workspace state under `graphify-out/` and must
not be committed.
