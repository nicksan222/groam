# Groam command map. Use the pinned toolchain; see .devcontainer/ for setup.
# `just` (no arguments) lists the recipes by group.

set dotenv-load

# List every recipe by group.
[private]
default:
    @just --list --unsorted

# ── Setup and dev servers ────────────────────────────────────────────────────

# Install the pinned workspace exactly as CI does.
[group('dev')]
install:
    VP_GIT_HOOKS=0 vp install --frozen-lockfile

# Start the web app (Vite). Convex is separate: run `just start-convex` first.
[group('dev')]
dev:
    vp run dev

# Start only the web app (same as `just dev`; the backend must already be running).
[group('dev')]
web:
    vp run dev:web

# Start the marketing site (Astro) on :4321.
[group('dev')]
landing:
    vp run dev:landing

# Start Convex (asks local or online; GROAM_CONVEX_MODE=local|online skips the prompt).
[group('dev')]
start-convex:
    #!/usr/bin/env bash
    set -euo pipefail
    mode="${GROAM_CONVEX_MODE:-}"
    if [[ -z $mode ]]; then
      if [[ -t 0 && -t 1 ]]; then
        cat <<'MENU'

    Which Convex backend do you want to develop against?

      1) local   Self-hosted anonymous backend on this machine (127.0.0.1:3210).
                 No account or login; data lives in .convex/local/. Best for offline work and seeding.
      2) online  Your personal Convex cloud dev deployment (runs `convex dev`).
                 Asks you to log in the first time; data lives in the cloud.

    MENU
        read -r -p "Choose [1/2] (default 1): " answer
        case "${answer:-1}" in
          1 | local | l | "") mode=local ;;
          2 | online | o) mode=online ;;
          *) echo "Unknown choice '$answer'; use 1 or 2." >&2; exit 2 ;;
        esac
      else
        echo "No terminal attached; using the local backend (set GROAM_CONVEX_MODE=local|online to choose)."
        mode=local
      fi
    fi
    case "$mode" in
      local)
        echo "Starting the local Convex backend."
        {{ just_executable() }} prepare-convex
        CONVEX_AGENT_MODE=anonymous exec vp exec convex dev --typecheck-components --start 'convex dashboard'
        ;;
      online)
        echo "Starting against an online Convex dev deployment (log in if asked)."
        unset CONVEX_AGENT_MODE
        export GROAM_CONVEX_MODE=online
        # First push creates/selects the deployment and writes CONVEX_DEPLOYMENT and VITE_CONVEX_URL to .env.local.
        vp exec convex dev --once --typecheck-components
        {{ just_executable() }} configure-local-auth --write-vite-site-url
        exec vp run convex:dev
        ;;
      *)
        echo "GROAM_CONVEX_MODE must be 'local' or 'online', got '$mode'." >&2
        exit 2
        ;;
    esac

# Open the local Convex dashboard.
[group('dev')]
dashboard:
    CONVEX_AGENT_MODE=anonymous vp run convex:dashboard

# Seed local demo data, five travelers, two groups, six trips.
[group('dev')]
seed *args:
    vp run seed {{ args }}

# ── Quality ──────────────────────────────────────────────────────────────────

# Run the complete CI quality suite.
[group('quality')]
check:
    vp run check

# Check conventions, package manifests, and source formatting.
[group('quality')]
lint:
    vp run lint

# Typecheck every workspace and loose tooling script.
[group('quality')]
typecheck:
    vp run typecheck

# Run unit and integration tests.
[group('quality')]
test:
    vp run test

# Run browser journeys against the running local backend (`just start-convex` and `just dev`).
[group('quality')]
journeys:
    vp run test:journeys

# Format manifests and source files.
[group('quality')]
format:
    vp run format

# Verify formatting without writing files.
[group('quality')]
format-check:
    vp run format:check

# ── Generated code and assets ────────────────────────────────────────────────

# Generate routes, auth schema, and Convex bindings.
[group('generate')]
codegen:
    CONVEX_AGENT_MODE=anonymous vp run codegen

# Regenerate every web and document brand asset from @groam/brand.
[group('generate')]
brand:
    vp run brand:generate

# Render every docs/ Excalidraw scene to the SVG committed beside it.
[group('generate')]
diagrams:
    vp run diagrams:render

# Refresh the Convex-managed guidelines and agent skills.
[group('generate')]
update-convex-agent-files:
    #!/usr/bin/env bash
    set -euo pipefail
    CONVEX_AGENT_MODE=anonymous vp exec convex ai-files update
    # Install upstream skills into the shared source and refresh native adapters.
    just sync-agents
    vp run lint:agents

# Refresh skill links and native agent wrappers from the shared source.
[group('agents')]
sync-agents:
    bun tooling/quality/agents/check.ts --sync

# ── Local backend setup ──────────────────────────────────────────────────────

# Bootstrap the local Convex backend, configure auth, then hand the backend to the
# `convex dev` watcher. Run by `just start-convex` in local mode.
[private]
prepare-convex:
    #!/usr/bin/env bash
    set -euo pipefail
    export CONVEX_AGENT_MODE=anonymous
    backend="$(sed -n 's/^VITE_CONVEX_URL=//p' .env.local 2>/dev/null | tail -n 1 || true)"
    backend="${backend:-http://127.0.0.1:3210}"
    responding() { [[ -n "$(curl -fsS --max-time 0.75 "$backend/instance_name" 2>/dev/null)" ]]; }

    if responding; then
      echo "Convex local backend already running; preparing it for the dev watcher."
    else
      bunx convex init
    fi
    timeout="${GROAM_READY_TIMEOUT_SECONDS:-180}"
    deadline=$((SECONDS + timeout))
    until responding; do
      if ((SECONDS >= deadline)); then
        echo "Convex backend did not become ready within ${timeout}s."
        echo "Skipping auth configuration until Convex is running."
        exit 0
      fi
      sleep 2
    done

    {{ just_executable() }} configure-local-auth --write-vite-site-url

    # Stop the bootstrap process (SIGTERM, then SIGKILL) so `convex dev` owns the backend.
    echo "Restarting the local backend under the Convex dev watcher."
    pids="$(ps -A -o pid=,command= | awk -v port="--port ${backend##*:}" -v state="$PWD/.convex/local/" \
      'index($0, "convex-local-backend") && index($0, port) && index($0, state) { print $1 }')"
    [[ -z $pids ]] || kill $pids
    for _ in {1..20}; do responding || exit 0; sleep 0.1; done
    [[ -z $pids ]] || kill -9 $pids 2>/dev/null || true
    sleep 0.1
    if responding; then
      echo "Unable to stop the existing Convex local backend." >&2
      exit 1
    fi

# Set the Convex auth variables (CI runs this too; local by default, online when
# GROAM_CONVEX_MODE=online). Secrets go through stdin, never argv.
[private]
configure-local-auth *flags:
    #!/usr/bin/env bash
    set -euo pipefail
    [[ ${GROAM_CONVEX_MODE:-local} == online ]] || export CONVEX_AGENT_MODE=anonymous
    site_url=http://localhost:5173
    names="$(bunx convex env list --names-only)"
    has() { grep -qx "$1" <<<"$names"; }
    secret() { openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'; }
    # Appends lines to a file, starting on a fresh line.
    append() { [[ ! -s $1 || -z "$(tail -c 1 "$1")" ]] || echo >>"$1"; printf '%s\n' "${@:2}" >>"$1"; }

    has BETTER_AUTH_SECRET || secret | bunx convex env set BETTER_AUTH_SECRET
    bunx convex env set SITE_URL "$site_url"

    if [[ " {{ flags }} " == *" --write-vite-site-url "* ]]; then
      if grep -q '^VITE_SITE_URL=' .env.local 2>/dev/null; then
        sed -i "s#^VITE_SITE_URL=.*#VITE_SITE_URL=$site_url#" .env.local
      else
        append .env.local '' '# Better Auth client origin' "VITE_SITE_URL=$site_url"
      fi
    fi

# ── Release ─────────────────────────────────────────────────────

# Hosted releases: `just deploy setup`, `just deploy preflight production`.
mod deploy 'tooling/deploy'

# Enable squash auto-merge for a pull request once its required checks pass.
[group('release')]
enable-pr-auto-merge pull-request:
    gh pr merge --auto --squash {{ pull-request }}
