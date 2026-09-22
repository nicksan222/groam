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

1. Add one spec entry in `packages/ai/src/tools/specs.ts` (example id:
   `'trip.thing.propose'`), with the `agents` field naming which agents may
   call it and the required `ui.card` facet (`activity`, `choice`, or
   `hidden`) saying how it renders. The capability id catalog, per-agent
   allowlists, and card lookup all derive from this entry — no other list
   to update.
2. Append one binding row to `assistantCapabilityBindings` in
   `packages/backend/assistant/tools/kinds/index.ts`: spread the spec and
   add only the Convex-bound `create` closure. A compile-time check fails
   the build until every spec has exactly one binding.
3. Implement the Convex write behind an existing domain helper. Reauthorize on
   every write. Do not add a parallel executor.

## Binding row

```ts
defineCapability({
  ...proposeThingSpec,
  create: (runtime) => createProposeThingTool(runtime)
}),
```

- Spec fields (`guidance`, `writeIntent`, `eventLabel`, …) live only in the
  spec entry. Omit `writeIntent` for read-only tools.
- Omit `eventLabel` to humanize `toolName` (`getItinerary` → "Read itinerary").
- Shared trip mutation helpers go in
  `packages/backend/assistant/tools/trips/`, not in
  React UI.
- Tool execution must not import `@groam/ai/ui/*`. The LLM sees every
  registered tool for the invoked agent; screen capabilities are not a
  security filter.

## Recording

`AgentRunTracking.recordStep` writes thoughts (model reasoning / chain-of-thought
before tools) and tool results onto `agentRunEvents`. Labels resolve through
the tool spec (`eventLabel`, else the humanized tool name). Chat, issue, and
reviewer loops already call `recordStep` — a new capability appears on
`/agents/$agentId/$runId` without UI or event-kind changes.

## Do not

- Teach the prompt to pick tools with keyword switches.
- Hand-edit frontend tool-name maps; the catalog owns names and run-log copy.
- Execute writes unless the current traveler message matches `writeIntent`.
- Add per-tool recording in session files or a parallel event map.
