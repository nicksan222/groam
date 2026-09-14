set dotenv-load

# Show the developer command surface.
default:
    @just --list

# Install the pinned workspace exactly as CI does.
install:
    HUSKY=0 bun install --frozen-lockfile

# Provision the pinned toolchain, dependencies, and seeded local backend for Cursor Cloud.
cloud-install:
    #!/usr/bin/env bash
    set -euo pipefail

    seed_scale="${GROAM_SEED_SCALE:-small}"
    bun_version="$(sed -n 's/.*"packageManager": "bun@\([^"]*\)".*/\1/p' package.json | head -n 1)"
    node_major="$(sed -n 's/.*"nodeVersion": "\([0-9][0-9]*\)".*/\1/p' convex.json | head -n 1)"
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"

    log() { printf '\n[groam-install] %s\n' "$*"; }

    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
      log "Installing nvm"
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    fi
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"

    if ! nvm which "$node_major" >/dev/null 2>&1; then
      log "Installing Node ${node_major}"
      nvm install "$node_major"
    fi
    nvm alias default "$node_major" >/dev/null
    nvm use --silent "$node_major"
    node_bin="$(dirname "$(nvm which "$node_major")")"

    if [ "$("$BUN_INSTALL/bin/bun" --version 2>/dev/null || true)" != "$bun_version" ]; then
      log "Installing Bun ${bun_version}"
      curl -fsSL https://bun.sh/install | bash -s "bun-v${bun_version}"
    fi
    export PATH="$node_bin:$BUN_INSTALL/bin:$PATH"
    marker_begin="# >>> groam cloud toolchain >>>"
    marker_end="# <<< groam cloud toolchain <<<"
    bashrc="$HOME/.bashrc"
    touch "$bashrc"
    temporary_bashrc="$(mktemp)"
    awk -v b="$marker_begin" -v e="$marker_end" '
      $0==b {skip=1} skip && $0==e {skip=0; next} !skip {print}
    ' "$bashrc" > "$temporary_bashrc"
    {
      cat "$temporary_bashrc"
      printf '%s\n' "$marker_begin"
      printf 'export BUN_INSTALL="%s"\n' "$BUN_INSTALL"
      printf 'export NVM_DIR="%s"\n' "$NVM_DIR"
      printf 'export PATH="%s:%s:$PATH"\n' "$node_bin" "$BUN_INSTALL/bin"
      printf '%s\n' "$marker_end"
    } > "$bashrc"
    rm -f "$temporary_bashrc"

    log "Toolchain ready: bun $(bun --version), node $(node --version)"
    log "Installing workspace dependencies"
    HUSKY=0 bun install --frozen-lockfile

    export CONVEX_AGENT_MODE=anonymous
    convex_log=/tmp/groam-install-convex.log
    : > "$convex_log"
    log "Starting Convex backend to seed demo data"
    setsid bunx convex dev --typecheck-components --tail-logs disable > "$convex_log" 2>&1 &
    convex_pgid=$!

    stop_convex() {
      if [ -n "${convex_pgid:-}" ]; then
        log "Stopping Convex backend"
        kill -TERM "-${convex_pgid}" 2>/dev/null || true
        sleep 3
        kill -KILL "-${convex_pgid}" 2>/dev/null || true
        wait "$convex_pgid" 2>/dev/null || true
        convex_pgid=""
      fi
    }
    trap stop_convex EXIT

    fail_install() {
      log "ERROR: $1"
      tail -n 80 "$convex_log" || true
      exit 1
    }

    log "Waiting for Convex"
    GROAM_STARTUP_TIMEOUT_MS="${GROAM_STARTUP_TIMEOUT_MS:-300000}" \
      bun tooling/devkit/wait-for-backend.ts || fail_install "Convex did not become ready in time"

    log "Configuring Better Auth"
    bun tooling/devkit/configure-auth.ts --write-vite-site-url || fail_install "Better Auth setup failed"

    log "Seeding demo data (scale: ${seed_scale})"
    seeded=0
    for attempt in 1 2 3; do
      if bun run seed -- --scale "$seed_scale"; then
        seeded=1
        break
      fi
      log "Seed attempt ${attempt} failed; retrying in 5s"
      sleep 5
    done
    [ "$seeded" -eq 1 ] || fail_install "seeding did not complete successfully"

    stop_convex
    trap - EXIT
    log "Install complete."

# Start Cursor Cloud's detached dev stack and return only when it is healthy.
cloud-start:
    #!/usr/bin/env bash
    set -euo pipefail

    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    node_major="$(sed -n 's/.*"nodeVersion": "\([0-9][0-9]*\)".*/\1/p' convex.json | head -n 1)"
    nvm use --silent "$node_major"
    node_bin="$(dirname "$(nvm which "$node_major")")"
    export PATH="$node_bin:$BUN_INSTALL/bin:$PATH"
    export CONVEX_AGENT_MODE=anonymous
    export GROAM_READY_TIMEOUT_SECONDS="${GROAM_READY_TIMEOUT_SECONDS:-240}"
    dev_log=/tmp/groam-dev.log

    log() { printf '\n[groam-start] %s\n' "$*"; }

    if ! bun tooling/devkit/wait-for-dev-stack.ts --once; then
      log "Starting dev stack; logs → ${dev_log}"
      : > "$dev_log"
      setsid bash -c 'exec bun run dev' > "$dev_log" 2>&1 &
    fi

    log "Waiting up to ${GROAM_READY_TIMEOUT_SECONDS}s for the dev stack"
    if ! bun tooling/devkit/wait-for-dev-stack.ts; then
      log "ERROR: dev stack did not become healthy. Recent logs:"
      tail -n 40 "$dev_log" 2>/dev/null || true
      exit 1
    fi

# Start Convex, Vite, and the dashboard locally.
dev:
    CONVEX_AGENT_MODE=anonymous bun run dev

# Start only the web app (the backend must already be running).
web:
    bun run dev:web

# Start the packaged desktop development stack.
desktop:
    bun run dev:desktop

# Run the complete CI quality suite.
check:
    bun run check

# Generate routes, auth schema, and Convex bindings.
codegen:
    CONVEX_AGENT_MODE=anonymous bun run codegen

# Format manifests and source files.
format:
    bun run format

# Verify formatting without writing files.
format-check:
    bun run format:check

# Check conventions, package manifests, and source formatting.
lint:
    bun run lint

# Typecheck every workspace and loose tooling script.
typecheck:
    bun run typecheck

# Run unit and integration tests.
test:
    bun run test

# Run browser tests against the CI-style static site.
e2e:
    bun run test:e2e

# Run browser tests against Vite on localhost:5173.
e2e-local:
    bun run test:e2e:local

# Seed local demo data; for example `just seed --scale small`.
seed *args:
    bun run seed -- {{ args }}

# Open the local Convex dashboard.
dashboard:
    CONVEX_AGENT_MODE=anonymous bun run convex:dashboard

# Capture, edit, and render the complete showcase.
showcase:
    bun run showcase

# Capture showcase browser footage from a running app.
showcase-capture:
    bun run showcase:capture

# Open the Remotion showcase editor.
showcase-studio:
    bun run showcase:studio

# Rebuild the compact README GIF from the committed showcase film.
showcase-gif:
    bun run showcase:gif

# Start the installed-app local runtime.
runtime:
    GROAM_DATA_DIR=/data GROAM_REPLACE_CONVEX_DIR=1 GROAM_SITE_ORIGIN=http://127.0.0.1:3211 bun apps/desktop/runtime/start.ts
