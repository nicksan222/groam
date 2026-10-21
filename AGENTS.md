# Working in Groam

This is the shared entry point for every coding harness. Follow the user's
scope and delivery instructions; preserve unrelated work. Repository guidance
supplements the session's tool, permission, and safety rules.

## Discover before changing

Treat source code and executable checks as the authority. Instructions describe
intent and how to find current examples; do not assume an example, signature,
model, port, credential, or command flag is still current.

- Start with `git status --short`, the root `Justfile` and `package.json` for
  available commands, and the nearest package README and manifest for ownership.
- Discover skills by listing `.agents/skills/*/SKILL.md` and reading their
  `name` and `description` fields. Load the matching instructions before
  changing the area they cover; open supporting references only as needed.
  The skill's base directory is the directory containing its actual `SKILL.md`.
- Search exact identifiers and paths with scoped `rg` and `rg --files`, then
  inspect callers, types, and nearby tests before editing. Graphify recipes in
  the `Justfile` are optional navigation aids when installed; verify their
  results against source and use `rg` when unavailable or incomplete.
- For architecture, use `docs/architecture/README.md` and the relevant package
  documentation. Confirm behavior in implementation and tests before relying
  on prose. Update the owning guidance when a change invalidates it.
- Skip generated code, vendored skills, lockfiles, and graph output during
  ordinary searches. Inspect them when the task concerns those artifacts.

## Runtime and verification

First check the working directory and available commands. The supported
reproducible toolchain is defined in `.devcontainer/` and the manifests; do not
copy version pins into instructions or install missing tools ad hoc.

Inside the dev container, run commands directly. From a host checkout, use the
existing container or `.devcontainer/devcontainer exec <command>` when the
required toolchain is absent. Read that script and the setup documentation
before starting or rebuilding a container. Cloud harnesses need the same tools;
report unavailable verification clearly rather than fabricating results.

- `just` lists workflows. Inspect the matching recipe and package script for
  current arguments and prerequisites. Use Vite+ for workspace tasks and Bun
  for standalone TypeScript tooling, as configured in the manifests.
- Local Convex commands require `CONVEX_AGENT_MODE=anonymous`; the `just`
  runtime/codegen recipes provide it. Distinguish local runtime from production
  deployment. Follow current backend documentation for authentication and AI
  configuration; never print private environment values.
- Find app URLs and ports in startup output and runtime configuration. Discover
  demo credentials and fixture state in the seeder configuration and docs.
  Read the seed command's help/defaults before using it: resets require explicit
  authorization. Keep one owner for servers, browsers, and shared fixture state.
- Run focused checks first, then the required broader gate for the change.
  Inspect `just check`, package scripts, and `.github/workflows/` to identify
  CI coverage. Report commands, results, and unrun checks honestly.
- Preserve Git hooks and checks. Never bypass hooks or weaken gates. Stage,
  commit, push, create PRs, or deploy only within the user's delivery request.

## Architecture constraints

Use existing, tested patterns and inspect a current neighbor before adding an
abstraction. The relevant skills explain how to locate builders and examples.

- Web pages (Void file routes under `apps/web/pages`) compose feature views;
  keep product behavior in features and reusable async state in feature hooks.
  Register new page paths in `AppPath`; there is no generated route tree.
- Backend public functions live under Convex routes. Inspect current custom
  builders, domain schemas, enriched contexts, and helpers before choosing
  handlers or argument shapes. Use the domain's current exports.
- Reusable UI primitives belong in `packages/ui`; assistant UI belongs in
  `packages/ai`. Inspect package exports for supported import paths.
- Use validated environment targets from `packages/env`; Convex runtime uses
  its generated typed environment. Inspect current validation and lint rules
  for the applicable boundary and bootstrap exceptions.
- `tooling/` owns shared configuration and quality rules. The convention checker,
  lint plugin, typechecks, and tests enforce the detailed contracts. Read those
  implementations when a rule or exception matters; avoid duplicating their
  full policy in prose.

## Delegation and roles

The main session owns the overall solution, integration, Git, and user
communication. Delegate bounded independent work only when it saves meaningful
time or context. Use models available to the current session, selecting the
least costly capable option; shared roles do not prescribe provider models.

Discover role descriptions in `.agents/roles/*.md`; read the selected role and
include its path or full instructions in the brief. Give each worker its goal,
permitted paths, acceptance evidence, and stopping point. Use native custom
agents when available. Otherwise pass the same shared role to a general worker.
If delegation is unavailable, apply the relevant role as an explicit inline
review/verification pass and report that it was not independent.

Roles are leaf workers. Honor each role's read-only and side-effect limits;
configure native restrictions when available. Prose is not a sandbox: review
changes and evidence before accepting a worker's report. Keep one writer per
file and one owner for combined verification. Neither a role nor a skill grants
permission for extra Git actions, deployments, messages, or data resets.

## Maintaining this tooling

`.agents/skills` and `.agents/roles` are the canonical sources. Provider entry
points and role adapters route here. See `.agents/README.md` for discovery,
maintenance, and supported adapters. Run `just sync-agents` after adding or
changing skills or role metadata; `vp run lint:agents` checks drift without
writing files. Do not copy shared instructions into provider configuration.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`packages/backend/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
