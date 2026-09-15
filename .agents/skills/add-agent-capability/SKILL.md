---
name: add-agent-capability
description: >-
  Add a new Groam assistant tool/capability that agents can call.
  Use when introducing a tool, write-intent, Convex agent action, or
  defineCapability registration — not when only adding an agent identity.
---

# Add an agent capability

A capability is the typed allowlist id an agent opts into. The kind file is
the catalog entry: tool, guidance, write intent, and run-log copy. Agents
never get a tool unless that id is on their `capabilities` list. Run pages
record every thought and every tool call automatically from this catalog —
do not add a second tool-name map, event kind, or `onStepFinish` branch.

## Steps

1. Add the dotted id to `assistantCapabilityIds` in
   `packages/ai-contracts/src/agents/registry/ids.ts` (example: `'trip.thing.propose'`).
2. Create `packages/backend/assistant/tools/kinds/<kebab-tool-name>.ts` with
   `defineCapability`. This is the single place the run log reads from.
3. Map the id in `assistantCapabilityRegistrations` in
   `packages/backend/assistant/tools/kinds/index.ts`. `AssistantToolKind.subscribe` runs
   from that file — do not subscribe from the kind file itself.
4. Allowlist the id on each agent in `packages/ai-contracts/src/agents/registry/kinds/`
   that should see the tool. The LLM sees every registered tool for the invoked
   agent; screen capabilities are not a security filter.
5. Implement the Convex write behind an existing domain helper. Reauthorize on
   every write. Do not add a parallel executor.

## Kind file

```ts
import { defineCapability } from '#backend/assistant/tools/factory';
import { createProposeThingTool } from '#backend/assistant/tools/trips/thing';

export const proposeThingCapability = defineCapability({
  create: (runtime) => createProposeThingTool(runtime),
  eventLabel: { complete: 'Proposed thing', running: 'Proposing thing' },
  guidance: 'Call proposeThing only after explicit confirmation.',
  id: 'trip.thing.propose',
  toolName: 'proposeThing',
  writeIntent: ['create', 'propose']
});
```

- Omit `writeIntent` for read-only tools.
- Omit `eventLabel` to humanize `toolName` (`getItinerary` → "Read itinerary").
- Shared trip mutation helpers go in
  `packages/backend/assistant/tools/trips/`, not in
  React UI.
- Tools depend on agent registry types; they must not import `@groam/ui/ai/*`.

## Recording

`AgentRunTracking.recordStep` writes thoughts (model reasoning / chain-of-thought
before tools) and tool results onto `agentRunEvents`. Labels come from
`AssistantToolKind.byToolName`. Chat, issue, and reviewer loops already call
`recordStep` — a new capability appears on `/agents/$agentId/$runId` without
UI or event-kind changes.

## Do not

- Teach the prompt to pick tools with keyword switches.
- Hand-edit frontend tool-name maps; the catalog owns names and run-log copy.
- Execute writes unless the current traveler message matches `writeIntent`.
- Add per-tool recording in session files or a parallel event map.
