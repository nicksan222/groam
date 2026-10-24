#!/usr/bin/env bash
# Runs on every attach (postAttachCommand). Offers the Convex backend choice
# unless something already answers on the local Convex port.
set -uo pipefail
cd "$(dirname "$0")/.."

url="${VITE_CONVEX_URL:-http://127.0.0.1:3210}"
if curl -fsS --max-time 1 "$url/instance_name" >/dev/null 2>&1; then
  echo "Convex already responds on $url; skipping start:convex."
  exit 0
fi

if [[ -t 0 && -t 1 ]]; then
  # An interactive terminal: ask, then keep the watcher in the foreground here.
  exec just start-convex
fi

# No terminal to ask on: start the local backend in the background (override with
# GROAM_CONVEX_MODE=online only if you are already logged in) and do not block attach.
mkdir -p .convex
log=.convex/start-convex.log
nohup just start-convex >"$log" 2>&1 &
echo "Convex starting in the background (log: $log). Run \`just start-convex\` in a terminal to choose local or online."
