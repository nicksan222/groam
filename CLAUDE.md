<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`packages/backend/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Environment

You run inside the dev container. Run every command directly (`just`, `vp`,
`bun`, `rg`, `graphify`); never wrap it in `devcontainer exec`. Toolchains are
pinned in `.devcontainer/` (Bun `1.3.11`, Node `24`, Just, Graphify, Headroom):
add or bump tooling there and rebuild, never install it ad hoc.

- `just` lists the command map; `just check` runs the full CI gate.
- Run workspace commands through Vite+: `vp install`, `vp run <script>`,
  `vp test`, `vp check` (Oxfmt + Oxlint, the only formatter and linter). Bun is
  the package manager behind `vp install` and the runtime for standalone TS
  scripts.
- Set `CONVEX_AGENT_MODE=anonymous` on every raw `convex` / `vp exec convex`
  command. Local Convex is a self-hosted anonymous backend; it needs no login
  or `CONVEX_ACCESS_TOKEN` (CI/deploy only). The `just` recipes set it already.
- The pre-commit hook (`tooling/hooks/pre-commit`) runs codegen, `vp staged`,
  conventions, React Doctor, and Fallow on staged changes. Never bypass it with
  `--no-verify`.

## Code search and context

Context is the scarce resource. Search narrow-to-wide and read only what you
need:

1. Architecture, ownership, call flow, "where does X happen", or any cross-file
   question: Graphify first, searched by identifier, not prose (it matches
   symbol names). Find a candidate name with `rg`, then
   `just graphify-explain <symbol>` (definition and neighbors),
   `just graphify-affected <symbol>` (callers and importers),
   `just graphify-path <from> <to>`, or `just graphify-query "<identifiers>"`.
   Lookups refresh `graphify-out/graph.json` first; open only the files they
   return. Tests are not indexed; find them with `rg`. If the graph is missing, run `just graphify-refresh`. Never install
   Graphify's Git hooks.
2. Exact names or strings: `rg` (or the Grep tool) scoped to a package path.
3. Broad sweeps across many files: delegate to the `Explore` subagent and keep
   its conclusion, not the file dumps.

Read files by line range once you know where to look; do not re-read files you
just edited. Skip generated and vendored output (`_generated/`,
`routeTree.gen.ts`, `graphify-out/`, `vendor/`, lockfiles) unless the task is
about them. Pipe noisy commands through `tail` or `rg` instead of dumping logs.

`claude` (terminal alias, `just claude`, and the VS Code extension) runs
`tooling/claude/claude.sh`. It starts or reuses the Headroom proxy, which
compresses tool output, and loads `tooling/claude/settings.json`, the Convex MCP
from `tooling/claude/mcp.json`, and the Headroom MCP from
`tooling/claude/mcp.headroom.json` (only while the proxy is up). Use
`headroom_retrieve` when a compressed marker hides detail you need. The Convex
MCP (local logs, data, function specs) needs a one-time `vp exec convex login`;
without it, use `rg` and the code. `CLAUDE_HEADROOM=off` skips the proxy (needed
for Remote Control). Caveman mode is on by default (`CAVEMAN_DEFAULT_MODE`); say "stop
caveman" for normal prose.

## Subagents

The main session leads: it owns scope, Git, and the user conversation, and
delegates bounded work to the project subagents in `.claude/agents`: `pm`
(acceptance criteria), `developer` (one slice), `qa` (verification), `reviewer`
and `upgrade-reviewer` (contracts, migrations), `traveler` (usability),
`pushback` (scope), `scenario` (local seed state), and `pr-maker` (authorized
PRs only). Brief each with the question, permitted paths, acceptance evidence,
and stopping point. Use only the lenses a change needs, run independent
subagents in parallel, keep one writer per file, and never let two agents run
dev servers, browsers, or seed resets at once. One owner runs the combined
`just check`; report failed or unrun checks honestly, never weaken them.

Project skills live in `.claude/skills`; load the matching one before adding a
route, module, hook, env variable, test, or UI piece.

## Architecture and conventions

- **Web routes:** one TanStack Router file per route under
  `apps/web/src/routes`, composing feature views only. Never hand-edit
  `routeTree.gen.ts` or add a central route registry. Product UI lives in
  `apps/web/src/features/<domain>`; queries, mutations, and async state live in
  `features/<domain>/hooks`. Split high-churn context (dialogs, selections)
  from stable workspace data so unrelated pages do not rerender.
- **Backend:** public Convex functions live in `packages/backend/convex/routes`
  as `export const run`. Domain modules in `packages/backend/convex/modules`
  export schema fragments, custom function builders, and plain helpers that
  take an enriched `ctx`; builders from `convex-helpers` bind `workspace` and
  `trip` onto `ctx`. No entity classes. See
  `packages/backend/convex/modules/README.md`.
- **UI:** shared primitives live in `packages/ui`. Import them through
  `@groam/ui/components/*`, `@groam/ui/hooks/*`, `@groam/ui/lib/*`, and
  `@groam/ui/styles`; do not duplicate primitives in apps.
- **Env:** import validated variables from `@groam/env/*`. Never read
  `process.env` or `import.meta.env` outside `packages/env`; Convex code uses the
  typed `env` from `_generated/server`.
- **Tooling:** shared lint, format, TypeScript, and React Doctor config lives
  under `tooling/`; root configs such as `vite.config.ts` only compose it.
- **Enforced conventions:** `vp run lint:conventions` checks kebab-case file
  and folder names, package-alias imports instead of `../`, semantic color
  tokens, `ctx.db` only in `components/`, `modules/`, and `routes/` (never in
  `'use node'` files), `@groam/env/*` instead of raw env access, public
  `@groam/ui` entrypoints, and thin route files. `vp run lint:claude`
  validates this harness.

## Local runtime

- `just dev` starts Convex, Vite, and the dashboard with package-labeled
  output; `just web` starts only Vite against a running backend. `just codegen`
  regenerates routes, the auth schema, and Convex bindings.
- Ports: web `5173`, Convex API `3210`, Convex site/HTTP `3211`, dashboard
  `6790`. `http://127.0.0.1:3211/` returns `503` locally because no static site
  is uploaded; that is expected. The app is served by Vite on `5173`.
- Browser tests run in Chromium through Vite+ browser mode (`vp test`). View
  tests are the `views` setup; `just journeys` runs the `journeys` setup
  (`apps/web/e2e`): the real app against the running local backend, served on
  `5174`, which local Better Auth trusts.
- AI assistant features use personal ChatGPT OAuth connections in Settings → AI.
  Resolve inference through `AssistantProvider.configured`; do not add provider
  API keys, gateway fallbacks, or deployment-funded inference.

### Demo login and seed data

Sign in at `http://localhost:5173/` as `demo@groam.example` / `GroamDemo123!`;
it owns the "Groam Demo" workspace with sample trips and travelers. Extra
travelers are `traveler.NNN@groam.example` (zero-padded, e.g.
`traveler.001@groam.example`) with the same password. Defaults live in
`packages/env/src/apps/seeder.ts`.

With the backend running, `just seed` resets and seeds 30 users / 40 trips;
`just seed --scale small` seeds 6 / 8 and `--scale large` 80 / 150. Pass
`--no-reset` to keep existing data. Data persists in the git-ignored `.convex/`
directory. `tooling/seeder` owns scenarios, fixtures, and plans and calls
primitives from `@groam/app-actions/backend`.

Without the seeded login, a fresh sign-up must create a group before the app is
usable; the "Create group" button stays disabled until a name is typed (the
"Acme Labs" placeholder is not a value). This is intended.

### Local overrides

Personal Claude configuration stays out of Git. Put models, provider routing,
env, and permissions in `.claude/settings.local.json`, personal notes in
`CLAUDE.local.md`, and extra MCP servers in `tooling/claude/mcp.local.json`.
Subagents ask for the `opus`/`sonnet` aliases, so a different provider (Bedrock,
Vertex, a gateway) only needs the alias mapping, for example:

```json
{
  "model": "opus",
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "<provider opus model id>",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "<provider sonnet model id>",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "<provider haiku model id>"
  }
}
```

`CLAUDE_CODE_SUBAGENT_MODEL` forces one model for every subagent.
