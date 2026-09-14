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

bun install --frozen-lockfile

printf '\nDev container ready.\n'
printf '  Pi: %s\n' "$(pi --version)"
printf '  Start everything: bun run dev\n'
