# Groam command map. Every recipe runs inside the dev container.
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

# Start Convex, Vite, and the dashboard locally.
[group('dev')]
dev:
    CONVEX_AGENT_MODE=anonymous vp run dev

# Start only the web app (the backend must already be running).
[group('dev')]
web:
    vp run dev:web

# Open the local Convex dashboard.
[group('dev')]
dashboard:
    CONVEX_AGENT_MODE=anonymous vp run convex:dashboard

# Seed local demo data, for example `just seed --scale small`.
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

# Run browser journeys against the running local backend (`just dev`).
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
    # The updater always recreates a root AGENTS.md and Codex-only
    # agents/openai.yaml files; this repo is Claude-only (CLAUDE.md + .claude/).
    rm -f AGENTS.md
    rm -rf .claude/skills/*/agents

# ── Agents and code graph ────────────────────────────────────────────────────

# Run Claude Code with the repo harness (Headroom, settings, MCP servers).
[group('agents')]
[positional-arguments]
claude *args:
    tooling/claude/claude.sh "$@"

# Search the code graph by identifiers; output is capped at `lines` lines.
[group('agents')]
graphify-query question lines="80": graphify-sync
    #!/usr/bin/env bash
    set -euo pipefail
    out="$(graphify query {{ quote(question) }} --budget 1500)"
    total="$(printf '%s\n' "$out" | wc -l)"
    printf '%s\n' "$out" | sed -n '1,{{ lines }}p'
    if (( total > {{ lines }} )); then
      echo "[truncated $(( total - {{ lines }} )) more lines; use sharper identifiers or just graphify-explain <symbol>]"
    fi

# Show a symbol's definition site and all of its direct graph neighbors.
[group('agents')]
graphify-explain symbol: graphify-sync
    @graphify explain {{ quote(symbol) }}

# List what calls, imports, or re-exports a symbol (the blast radius of a change).
[group('agents')]
graphify-affected symbol depth="2": graphify-sync
    @graphify affected {{ quote(symbol) }} --depth {{ depth }}

# Trace the shortest call/import path between two symbols.
[group('agents')]
graphify-path source target: graphify-sync
    #!/usr/bin/env bash
    set -euo pipefail
    out="$(graphify path {{ quote(source) }} {{ quote(target) }})"
    if [[ "$out" == "No directed path"* ]]; then
      echo "(no directed path; showing undirected path, which may pass through a shared importer)"
      graphify path {{ quote(source) }} {{ quote(target) }} --undirected
    else
      printf '%s\n' "$out"
    fi

# Excludes live in tooling/graphify/exclude.txt (gitignore syntax).

# Rebuild the code graph incrementally (~2s; lookups already do this).
[group('agents')]
graphify-refresh:
    #!/usr/bin/env bash
    set -euo pipefail
    excludes=()
    while IFS= read -r pattern; do
      [[ -z "$pattern" || "$pattern" == \#* ]] || excludes+=(--exclude "$pattern")
    done < tooling/graphify/exclude.txt
    graphify extract . --code-only --no-cluster "${excludes[@]}"

# Refresh the graph quietly before a lookup. The extractor log prints only on failure.
[private]
graphify-sync:
    #!/usr/bin/env bash
    set -uo pipefail
    log="$(just graphify-refresh 2>&1)" || { printf '%s\n' "$log" >&2; exit 1; }

# ── Release and showcase ─────────────────────────────────────────────────────

# Enable squash auto-merge for a pull request once its required checks pass.
[group('release')]
enable-pr-auto-merge pull-request:
    gh pr merge --auto --squash {{ pull-request }}

# Capture, edit, and render the complete showcase.
[group('showcase')]
showcase:
    vp run showcase

# Capture showcase browser footage from a running app.
[group('showcase')]
showcase-capture:
    vp run showcase:capture

# Open the Remotion showcase editor.
[group('showcase')]
showcase-studio:
    vp run showcase:studio

# Rebuild the compact README GIF from the committed showcase film.
[group('showcase')]
showcase-gif:
    vp run showcase:gif
