set dotenv-load

# Show the developer command surface.
default:
    @just --list

# Install the pinned workspace exactly as CI does.
install:
    HUSKY=0 bun install --frozen-lockfile

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

# Refresh the Convex-managed guidelines and agent skills.
update-convex-agent-files:
    CONVEX_AGENT_MODE=anonymous bunx convex ai-files update

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
    bun run brand:generate

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
