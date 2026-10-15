#!/usr/bin/env bash
set -Eeuo pipefail

# Docker creates named-volume roots as root. Hand them to the unprivileged
# development user before Bun or the Convex CLI tries to write to them.
readonly persistent_dirs=(
  "${PWD}/node_modules"
  "${HOME}/.bun/install/cache"
)

sudo mkdir -p "${persistent_dirs[@]}"
sudo chown -R "$(id -u):$(id -g)" "${persistent_dirs[@]}"

# Never chown/chmod the host-mounted Claude or GitHub credentials.

VP_GIT_HOOKS=0 vp install --frozen-lockfile

# Interactive `claude` uses the repository harness (Headroom, plugins, MCP).
# An alias, not a PATH shim, so Headroom still launches the real binary.
claude_alias="alias claude='${PWD}/tooling/claude/claude.sh'"
for rc in "${HOME}/.bashrc" "${HOME}/.zshrc"; do
  touch "$rc"
  grep -qxF "$claude_alias" "$rc" || printf '\n%s\n' "$claude_alias" >> "$rc"
done

# Build a private, local code graph so search works on the first agent turn.
# Keep this code-only: repository docs and media would require an LLM pass.
just graphify-refresh

printf '\nDev container ready.\n'
printf '  Claude Code: %s\n' "$(claude --version)"
printf '  Graphify: %s\n' "$(graphify --version)"
printf '  Headroom: %s\n' "$(headroom --version)"
printf '  Host Claude/GitHub credentials are mounted; OAuth/API tokens are forwarded.\n'
printf '  claude: aliased to tooling/claude/claude.sh (Headroom, Caveman, MCP)\n'
printf '  macOS keychain login: forward CLAUDE_CODE_OAUTH_TOKEN from claude setup-token.\n'
printf '  Search code: just graphify-query "how does authentication work?"\n'
printf '  Start everything: vp run dev\n'
