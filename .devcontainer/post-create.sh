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

HUSKY=0 bun install --frozen-lockfile

# Build a private, local code graph so search works on the first agent turn.
# Keep this code-only: repository docs and media would require an LLM pass.
just graphify-refresh

printf '\nDev container ready.\n'
printf '  Claude Code: %s\n' "$(claude --version)"
printf '  Herdr: %s\n' "$(herdr --version)"
printf '  Graphify: %s\n' "$(graphify --version)"
printf '  Host Claude/GitHub credentials are mounted; OAuth/API tokens are forwarded.\n'
printf '  Agent team: just agents-doctor && just agents\n'
printf '  macOS keychain login: forward CLAUDE_CODE_OAUTH_TOKEN from claude setup-token.\n'
printf '  Search code: just graphify-query "how does authentication work?"\n'
printf '  Start everything: bun run dev\n'
