---
name: add-assistant-agent
description: >-
  Register a new Groam chat or standalone assistant agent in packages/ai.
  Use whenever adding, renaming, or splitting an AI agent, worker, mention
  handle, or assignable issue/proposal agent — even if the user says "bot",
  "persona", or "new @mention".
---

# Add an assistant agent

Agent identity lives only in `@groam/ai` (`packages/ai/src/agents/`). Ids
lists, guards, mentions, and capability catalogs all derive from the catalog
— never duplicate them in `packages/backend` or `apps/web`.

## Chat vs standalone

| Surface | When | Factory |
| --- | --- | --- |
| Chat | Traveler `@mention`s it in a thread | `defineChatAgent` |
| Standalone | Assigned to an issue or proposal; no chat | `defineStandaloneAgent` |

The mention is derived as `` `@${id}` ``; never set it by hand.

## Steps

1. Extend `AssistantAgentId` in `packages/ai/src/agents/ids.ts`. It is
   declared (not derived) to cut the catalog ↔ tool-spec cycle. Extend
   `AgentAssignableTarget` only for a brand-new kind of assignable target.
2. Create `packages/ai/src/agents/<id>/definition.ts` (templates below).
3. Add one line to `assistantAgents` in `packages/ai/src/agents/catalog.ts`.
   The map must satisfy `Record<AssistantAgentId, …>` or compilation fails.
4. Grant tools by adding the id to the `agents` field of the relevant entries
   in `packages/ai/src/tools/specs.ts`; `capabilitiesForAgent(id)` picks them
   up. A brand-new tool is the `add-agent-capability` skill.
5. Cover it in `packages/ai/src/agents/definition.test.ts` /
   `index.test.ts`: assert mention, surface, policies, and
   `instructionsFor(...)` output — never call a model.
6. Run `vp run typecheck` and `vp run test`.

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
  policies: ['Prefer primary sources.'] // optional for chat agents
});
```

Standalone (`assignable` is `'issue'` and/or `'proposal'`; `policies` required):

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

- Special-case the new id in `packages/ai/src/backend/instructions/`; put
  worker rules in `policies`.
- Add a sibling `agent.ts` next to an `agents/<id>/` folder.
- Add per-agent UI files in `agents/`; agent UI lives in `packages/ai/src/ui`
  (`place-ai-ui`).
