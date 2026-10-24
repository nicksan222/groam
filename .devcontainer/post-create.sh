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

# Browser-mode tests (`vp test`) need the Chromium build matching the locked
# Playwright provider; its system libraries come from the Dockerfile.
vp run test:browsers:install

printf '\nDev container ready.\n'
printf '  Claude Code: %s\n' "$(claude --version)"
printf '  Credentials: host ~/.claude, ~/.claude.json and ~/.config/gh are mounted;\n'
printf '    host CLAUDE_CODE_OAUTH_TOKEN, GH_TOKEN and provider API keys are forwarded when set.\n'
printf '  macOS keychain login does not carry over: run `claude setup-token` on the host\n'
printf '    and export CLAUDE_CODE_OAUTH_TOKEN before opening the container.\n'
printf '  Convex: just start-convex (asks local or online; also offered when you attach)\n'
printf '  Web app: just dev (landing: just landing)\n'
