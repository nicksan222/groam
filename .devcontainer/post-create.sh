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

# Interactive `claude` in bash and zsh uses the repository harness (Headroom,
# Caveman, MCP). An alias, not a PATH shim, so the harness still finds the real
# binary. Home is rebuilt with the container, so this reruns on every rebuild;
# any earlier harness alias (e.g. from another workspace path) is replaced.
claude_wrapper="${PWD}/tooling/claude/claude.sh"
claude_alias="alias claude='${claude_wrapper}'"
for rc in "${HOME}/.bashrc" "${HOME}/.zshrc"; do
  touch "$rc"
  sed -i "\\#^alias claude='.*/tooling/claude/claude\\.sh'\$#d" "$rc"
  printf '%s\n' "$claude_alias" >> "$rc"
done

# Build a private, local code graph so search works on the first agent turn.
# Keep this code-only: repository docs and media would require an LLM pass.
just graphify-refresh

printf '\nDev container ready.\n'
printf '  Claude Code: %s\n' "$(claude --version)"
printf '  Graphify: %s\n' "$(graphify --version)"
printf '  Headroom: %s\n' "$(headroom --version)"
printf '  claude (new bash/zsh shells) and the VS Code extension run through\n'
printf '    tooling/claude/claude.sh: Headroom proxy, Caveman, Convex + Headroom MCP.\n'
printf '  Credentials: host ~/.claude, ~/.claude.json and ~/.config/gh are mounted;\n'
printf '    host CLAUDE_CODE_OAUTH_TOKEN, GH_TOKEN and provider API keys are forwarded when set.\n'
printf '  macOS keychain login does not carry over: run `claude setup-token` on the host\n'
printf '    and export CLAUDE_CODE_OAUTH_TOKEN before opening the container.\n'
printf '  Search code: just graphify-explain assertPlanner\n'
printf '  Start everything: just dev\n'
