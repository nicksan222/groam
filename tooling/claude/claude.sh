#!/usr/bin/env bash
# Launch Claude Code through the Headroom compression proxy. Everything else
# (plugins, MCP servers) is standard project config: .claude/settings.json and
# .mcp.json.
#
#   claude.sh [args...]               terminal (`claude` alias, `just claude`)
#   claude.sh /path/to/claude [args]  VS Code `claudeCode.claudeProcessWrapper`
#
# Stdout belongs to Claude alone (the extension speaks stream-json over it), so
# this script only ever writes to stderr. Headroom is best-effort: if the proxy
# cannot start, Claude starts without compression instead of failing.
#
# Env: CLAUDE_HEADROOM=off skips the proxy; HEADROOM_PORT (default 8787) picks
# its port; HEADROOM_WRAP_PROXY_TIMEOUT (default 60s) bounds a cold start.
set -euo pipefail

warn() { printf 'claude harness: %s\n' "$*" >&2; }

# The extension passes its bundled binary first; use it so versions match.
claude_bin=claude
if [[ ${1:-} == */claude && -f ${1:-} && -x ${1:-} ]]; then
  claude_bin=$1
  shift
fi

# Management subcommands and internal modes talk to the CLI, not a model
# session, so they get no harness. Keep in sync with `claude --help` Commands.
case "${1:-}" in
  agents | attach | auth | auto-mode | daemon | doctor | gateway | import | install | \
    kill | logs | mcp | plugin | plugins | project | remote-control | respawn | rm | \
    setup-token | stop | ultrareview | update | upgrade | \
    -v | --version | -h | --help | --claude-in-chrome-mcp)
    exec "$claude_bin" "$@"
    ;;
esac

# Headroom's anonymous upload beacon is opt-out; keep it off unless asked.
export HEADROOM_BEACON="${HEADROOM_BEACON:-off}"

port="${HEADROOM_PORT:-8787}"
proxy_url="http://127.0.0.1:$port"
state_dir="${HEADROOM_WORKSPACE_DIR:-$HOME/.headroom}"
proxy_log="$state_dir/logs/proxy-stdio-$port.log"

# Prints why this launch should bypass Headroom, or nothing.
headroom_skip_reason() {
  case "${CLAUDE_HEADROOM:-on}" in
    0 | off | false | no) echo "CLAUDE_HEADROOM=${CLAUDE_HEADROOM}" && return ;;
  esac
  if ! command -v headroom >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
    echo "headroom is not installed (rebuild the dev container)" && return
  fi
  # A personal gateway or cloud provider keeps its own routing; the shared
  # proxy forwards to api.anthropic.com.
  if [[ -n ${ANTHROPIC_BASE_URL:-} || -n ${CLAUDE_CODE_USE_BEDROCK:-} ||
    -n ${CLAUDE_CODE_USE_VERTEX:-} || -n ${CLAUDE_CODE_USE_FOUNDRY:-} ]]; then
    echo "a custom Anthropic endpoint or cloud provider is configured" && return
  fi
  # Claude Code disables Remote Control behind a custom ANTHROPIC_BASE_URL.
  local arg
  for arg in "$@"; do
    if [[ $arg == --remote-control* ]]; then
      echo "Remote Control needs a direct connection" && return
    fi
  done
}

# Prints ready, loading, foreign, or down.
proxy_state() {
  local body
  if ! body="$(curl -sS -m 2 "$proxy_url/readyz" </dev/null 2>/dev/null)"; then
    echo down
  elif [[ $body != *'"service":"headroom-proxy"'* ]]; then
    echo foreign
  elif [[ $body == *'"ready":true'* ]]; then
    echo ready
  else
    echo loading
  fi
}

# Reuse a running proxy or start a detached one. Started proxies are marked
# wrap-owned, so Headroom's orphan watchdog stops them after ~15 idle minutes
# with no live client marker (written below) and no traffic.
ensure_proxy() {
  local timeout="${HEADROOM_WRAP_PROXY_TIMEOUT:-60}" pid='' ticks=0
  mkdir -p "$state_dir/logs" 2>/dev/null || return 1
  # Serialize cold starts across concurrent launches when flock exists.
  if command -v flock >/dev/null 2>&1 && { exec 9>"$state_dir/.claude-harness-$port.lock"; } 2>/dev/null; then
    flock -w "$timeout" 9 || true
  fi
  local detach=setsid
  command -v setsid >/dev/null 2>&1 || detach=nohup
  while :; do
    case "$(proxy_state)" in
      ready) break ;;
      foreign) warn "port $port is taken by something other than Headroom" && return 1 ;;
      down)
        if [[ -z $pid ]]; then
          pid="$(
            HEADROOM_WRAP_OWNED=1 HEADROOM_AGENT_TYPE=claude HEADROOM_STACK=wrap_claude \
              PYTHONSAFEPATH=1 PYTHONIOENCODING=utf-8 \
              "$detach" headroom proxy --port "$port" --no-rate-limit \
              </dev/null >>"$proxy_log" 2>&1 9>&- &
            echo $!
          )"
        elif ! kill -0 "$pid" 2>/dev/null; then
          warn "Headroom proxy exited during startup; see $proxy_log" && return 1
        fi
        ;;
    esac
    if ((ticks >= timeout * 4)); then
      warn "Headroom proxy not ready after ${timeout}s; see $proxy_log" && return 1
    fi
    sleep 0.25
    ticks=$((ticks + 1))
  done
  # Client marker for the watchdog; `exec` below hands this PID to Claude.
  local clients="$state_dir/clients/$port"
  { mkdir -p "$clients" && chmod 700 "$clients" &&
    printf '{"pid": %d, "started_at": %d}\n' "$$" "$(date +%s)" >"$clients/$$.json"; } \
    2>/dev/null || true
}

# Tag requests for Headroom's per-project stats and CCR routing, as
# `headroom wrap` does. Headers the user already set win.
add_header() {
  local name=$1 value=$2 existing="${ANTHROPIC_CUSTOM_HEADERS:-}"
  [[ $value =~ ^[A-Za-z0-9/._~:()-]+$ ]] || return 0
  if printf '%s\n' "$existing" | grep -qi "^[[:space:]]*$name[[:space:]]*:"; then
    return 0
  fi
  export ANTHROPIC_CUSTOM_HEADERS="${existing:+$existing$'\n'}$name: $value"
}

skip_reason="$(headroom_skip_reason "$@")"
if [[ -z $skip_reason ]] && ensure_proxy; then
  export ANTHROPIC_BASE_URL="$proxy_url" HEADROOM_PROXY_URL="$proxy_url"
  # A custom base URL turns off deferred tool loading unless this is set.
  tool_search="${ENABLE_TOOL_SEARCH:-}"
  [[ -n ${tool_search//[[:space:]]/} ]] || export ENABLE_TOOL_SEARCH=true
  add_header X-Headroom-Project "${PWD##*/}"
  add_header X-Headroom-Cwd "$PWD"
elif [[ $skip_reason != CLAUDE_HEADROOM=* ]]; then
  warn "${skip_reason:-Headroom proxy unavailable}; starting Claude without compression"
fi
exec 9>&-

exec "$claude_bin" "$@"
