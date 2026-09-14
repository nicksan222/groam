---
name: add-assistant-agent
description: >-
  Register a new Groam chat or standalone assistant agent in packages/ai-contracts.
  Use whenever adding, renaming, or splitting an AI agent, worker, mention
  handle, or assignable issue/proposal agent — even if the user says "bot",
  "persona", or "new @mention".
---

# Add an assistant agent

Agent identity lives only in `@groam/ai-contracts`. Do not duplicate catalogs, mentions, or
capability lists in `packages/backend` or the web app.

## Chat vs standalone

| Surface | When | Factory |
| --- | --- | --- |
| Chat | Traveler `@mention`s it in a thread | `defineChatAgent` |
| Standalone | Assigned to an issue or proposal; no chat | `defineStandaloneAgent` |

Mention is derived as `` `@${id}` ``. Do not set it by hand.

## Steps

1. Add the kebab id to `chatAgentIds` or `standaloneAgentIds` in
   `packages/ai-contracts/src/agents/registry/ids.ts`.
2. Create `packages/ai-contracts/src/agents/registry/kinds/<id>.ts`. Put worker-specific
   rules in `policies`, not in `instructions/`.
3. Import it and add it to `assistantAgents` in
   `packages/ai-contracts/src/agents/registry/kinds/index.ts`. Types fail until the map
   covers every id.
4. Allowlist existing capability ids from `assistantCapabilityIds`. A new tool
   is a different skill (`add-agent-capability`).
5. Colocate a unit test next to `kind.ts` or `kinds/<id>.ts` that asserts
   mention/surface/policies without calling a model.

## Templates

Chat:

```ts
import { defineChatAgent } from '#ai-contracts/agents/registry/kind';

export const scoutAgent = defineChatAgent({
  capabilities: ['web.search', 'context.screen.read'],
  description: 'Researches places for the current trip.',
  id: 'scout',
  identity: 'You are Scout, a research specialist.',
  label: 'Scout',
  policies: ['Prefer primary sources.']
});
```

Standalone (`assignable` is `'issue'` and/or `'proposal'`):

```ts
import { defineStandaloneAgent } from '#ai-contracts/agents/registry/kind';

export const budgetAgent = defineStandaloneAgent({
  assignable: ['proposal'],
  capabilities: ['trip.status.read'],
  description: 'Checks idea costs without a chat.',
  id: 'budget',
  label: 'Budget agent',
  policies: ['Do not edit the shared trip.']
});
```

## Do not

- Special-case the new id in `packages/ai-contracts/src/agents/instructions/`.
- Add a sibling `agent.ts` next to `agent/`.
- Call a model to prove registration; `instructionsFor` is enough.
