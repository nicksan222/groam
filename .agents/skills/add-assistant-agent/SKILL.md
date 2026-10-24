---
name: add-assistant-agent
description: >-
  Register a new Groam chat or standalone assistant agent in packages/ai.
  Use whenever adding, renaming, or splitting an AI agent, worker, mention
  handle, or assignable issue/proposal agent — even if the user says "bot",
  "persona", or "new @mention".
---

# Add an assistant agent

Agent identity belongs in `packages/ai/src/agents/`. Catalog consumers derive
ids, mentions, guards, and capability access; do not duplicate these in the
backend or web app. This skill concerns product agents, not harness subagents.

1. Read `definition.ts`, `ids.ts`, and `catalog.ts` in that directory. Inspect
   existing `*/definition.ts` files to choose the current chat or standalone
   factory and discover required policies and assignable targets.
2. Extend the declared id union and catalog together. Only extend assignable
   targets when adding a new target kind. Let the factory derive mention syntax.
3. Grant tools through `packages/ai/src/tools/specs.ts`; use
   `add-agent-capability` when a new tool is required.
4. Follow `definition.test.ts` and `index.test.ts` for deterministic catalog,
   mention, policy, and instruction checks. Do not call a model to test identity.
5. Discover the package test and typecheck commands in `packages/ai/package.json`
   and the root manifest, and run the relevant checks.

Keep worker-specific instructions in definition policies rather than branching
on ids in backend prompt assembly. Agent UI belongs in `packages/ai/src/ui`,
not beside identity definitions.
