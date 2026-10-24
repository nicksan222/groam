#!/usr/bin/env bash
set -Eeuo pipefail

# Runs on the host. Create missing mount sources without touching existing credentials.
: "${HOME:?Host HOME must be set for credential mounts}"
umask 077
mkdir -p -m 700 "${HOME}/.claude" "${HOME}/.config/gh"

# Docker treats missing file mounts as directories; noclobber protects concurrent writes.
claude_config="${HOME}/.claude.json"
if [[ ! -e "$claude_config" && ! -L "$claude_config" ]]; then
  (set -o noclobber; printf '{}\n' > "$claude_config") || [[ -f "$claude_config" ]]
fi
if [[ ! -f "$claude_config" ]]; then
  printf 'Claude config mount must be a file: %s\n' "$claude_config" >&2
  exit 1
fi
