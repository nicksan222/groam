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

HUSKY=0 bun install --frozen-lockfile

# Build a private, local code graph so search works on the first agent turn.
# Keep this code-only: repository docs and media would require an LLM pass.
just graphify-refresh

printf '\nDev container ready.\n'
printf '  Pi: %s\n' "$(pi --version)"
printf '  Graphify: %s\n' "$(graphify --version)"
printf '  Search code: just graphify-query "how does authentication work?"\n'
printf '  Start everything: bun run dev\n'
