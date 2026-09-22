---
name: add-assistant-agent
description: >-
  Register a new Groam chat or standalone assistant agent in packages/ai.
  Use whenever adding, renaming, or splitting an AI agent, worker, mention
  handle, or assignable issue/proposal agent — even if the user says "bot",
  "persona", or "new @mention".
---

# Add an assistant agent

Agent identity lives only in `@groam/ai`. Do not duplicate catalogs, mentions, or
capability lists in `packages/backend` or the web app.

## Chat vs standalone

| Surface | When | Factory |
| --- | --- | --- |
| Chat | Traveler `@mention`s it in a thread | `defineChatAgent` |
| Standalone | Assigned to an issue or proposal; no chat | `defineStandaloneAgent` |

Mention is derived as `` `@${id}` ``. Do not set it by hand.

## Steps

1. Create `packages/ai/src/agents/<id>/` with `definition.ts` (identity via
   `defineChatAgent` / `defineStandaloneAgent`, capabilities derived from
   tool specs, exposure block with mention / assignable targets / serving
   routes) and `ui.ts` (presentation surface).
2. Add one line for it on `assistantAgents` in
   `packages/ai/src/agents/catalog.ts`. Id lists, id types, and guards derive
   from that map — there is no separate id list to update. Put
   worker-specific rules in `policies`, not in `backend/instructions/`.
3. Give it tools by naming its id in the `agents` field of the relevant
   spec entries in `packages/ai/src/tools/specs.ts`; capabilities derive
   from there via `capabilitiesForAgent`. A brand-new tool is a different
   skill (`add-agent-capability`).
4. Colocate a unit test next to `definition.ts` that asserts
   mention/surface/policies without calling a model.

## Templates

Chat (`agents/scout/definition.ts`):

```ts
import { defineChatAgent } from '#ai/agents/definition';
import { capabilitiesForAgent } from '#ai/tools/specs';

export const scoutAgent = defineChatAgent({
  capabilities: capabilitiesForAgent('scout'),
  description: 'Researches places for the current trip.',
  id: 'scout',
  identity: 'You are Scout, a research specialist.',
  label: 'Scout',
  policies: ['Prefer primary sources.']
});
```

Standalone (`assignable` is `'issue'` and/or `'proposal'`):

```ts
import { defineStandaloneAgent } from '#ai/agents/definition';
import { capabilitiesForAgent } from '#ai/tools/specs';

export const budgetAgent = defineStandaloneAgent({
  assignable: ['proposal'],
  capabilities: capabilitiesForAgent('budget'),
  description: 'Checks idea costs without a chat.',
  id: 'budget',
  label: 'Budget agent',
  policies: ['Do not edit the shared trip.']
});
```

## Do not

- Special-case the new id in `packages/ai/src/backend/instructions/`.
- Add a sibling `agent.ts` next to `agent/`.
- Call a model to prove registration; `instructionsFor` is enough.
