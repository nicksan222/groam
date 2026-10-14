set dotenv-load

# Show the developer command surface.
default:
    @just --list

# Install the pinned workspace exactly as CI does.
install:
    VP_GIT_HOOKS=0 vp install --frozen-lockfile

# Start Convex, Vite, and the dashboard locally.
dev:
    CONVEX_AGENT_MODE=anonymous vp run dev

# Start or attach the Claude development team.
[positional-arguments]
agents *args:
    python3 .agents/team/agents.py up "$@"

alias agent := agents

# Run Claude Code.
[positional-arguments]
claude *args:
    claude "$@"

# Check tools and Claude login without model requests.
[positional-arguments]
agents-doctor *args:
    python3 .agents/team/agents.py doctor "$@"

# List roles and models.
agents-list:
    python3 .agents/team/agents.py list

# Stop this team or selected roles.
[positional-arguments]
agents-stop *args:
    python3 .agents/team/agents.py down "$@"

# Restart conversations and clear the checkpoint, preserving code.
[positional-arguments]
agents-reset *args:
    python3 .agents/team/agents.py reset "$@"

# Test the launcher without model requests.
agents-test:
    python3 .agents/team/test-agents.py

# Start only the web app (the backend must already be running).
web:
    vp run dev:web

# Start the packaged desktop development stack.
desktop:
    vp run dev:desktop

# Run the complete CI quality suite.
check: agents-test
    vp run check

# Generate routes, auth schema, and Convex bindings.
codegen:
    CONVEX_AGENT_MODE=anonymous vp run codegen

# Refresh the Convex-managed guidelines and agent skills.
update-convex-agent-files:
    CONVEX_AGENT_MODE=anonymous vp exec convex ai-files update

# Build or incrementally refresh the local, API-key-free code graph.
graphify-refresh:
    graphify extract . --code-only --no-cluster

# Refresh, then search the code graph with a natural-language question.
graphify-query question: graphify-refresh
    graphify query {{ quote(question) }}

# Refresh, then explain one symbol or concept and its graph neighbors.
graphify-explain concept: graphify-refresh
    graphify explain {{ quote(concept) }}

# Refresh, then trace the shortest relationship path between two concepts.
graphify-path source target: graphify-refresh
    graphify path {{ quote(source) }} {{ quote(target) }}

# Enable squash auto-merge for a pull request after its required checks pass.
enable-pr-auto-merge pull-request:
    gh pr merge --auto --squash {{ pull-request }}

# Regenerate every web, desktop, and document brand asset from @groam/brand.
brand:
    vp run brand:generate

# Format manifests and source files.
format:
    vp run format

# Verify formatting without writing files.
format-check:
    vp run format:check

# Check conventions, package manifests, and source formatting.
lint:
    vp run lint

# Typecheck every workspace and loose tooling script.
typecheck:
    vp run typecheck

# Run unit and integration tests.
test:
    vp run test

# Run browser tests against the CI-style static site.
e2e:
    vp run test:e2e

# Run browser tests against Vite on localhost:5173.
e2e-local:
    vp run test:e2e:local

# Seed local demo data; for example `just seed --scale small`.
seed *args:
    vp run seed {{ args }}

# Open the local Convex dashboard.
dashboard:
    CONVEX_AGENT_MODE=anonymous vp run convex:dashboard

# Capture, edit, and render the complete showcase.
showcase:
    vp run showcase

# Capture showcase browser footage from a running app.
showcase-capture:
    vp run showcase:capture

# Open the Remotion showcase editor.
showcase-studio:
    vp run showcase:studio

# Rebuild the compact README GIF from the committed showcase film.
showcase-gif:
    vp run showcase:gif

# Start the installed-app local runtime.
runtime:
    GROAM_DATA_DIR=/data GROAM_REPLACE_CONVEX_DIR=1 GROAM_SITE_ORIGIN=http://127.0.0.1:3211 bun apps/desktop/runtime/start.ts
