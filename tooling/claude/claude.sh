#!/usr/bin/env bash
# Launch Claude Code with the repository harness: Headroom compression proxy,
# project settings (plugins), and MCP servers. The dev container aliases
# `claude` to this script; `just claude` calls it too.
set -euo pipefail

config_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Management subcommands talk to the CLI itself, not a model session.
case "${1:-}" in
  agents | attach | auth | auto-mode | doctor | gateway | import | install | logs | mcp | \
    plugin | project | respawn | rm | setup-token | stop | ultrareview | update | \
    -v | --version | -h | --help)
    exec claude "$@"
    ;;
esac

harness_args=(
  --settings "$config_dir/settings.json"
  --mcp-config "$config_dir/mcp.json"
)
# Personal, git-ignored MCP servers.
if [[ -f "$config_dir/mcp.local.json" ]]; then
  harness_args+=(--mcp-config "$config_dir/mcp.local.json")
fi

if ! command -v headroom >/dev/null 2>&1; then
  echo "headroom not found; starting Claude without compression (rebuild the dev container)." >&2
  exec claude "${harness_args[@]}" "$@"
fi

exec headroom wrap claude --no-mcp --code-memory none -- "${harness_args[@]}" "$@"
