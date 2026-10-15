---
name: add-agent-capability
description: >-
  Add a new Groam assistant tool/capability that agents can call. Use when
  introducing a tool, write intent, Convex-backed agent action, or
  defineCapability binding — not when only adding an agent identity
  (use add-assistant-agent).
---

# Add an agent capability

A capability is the typed tool id an agent opts into. Its spec entry is the
whole catalog record: allowed agents, prompt guidance, card UI, write intent,
and run-log copy. Agents never get a tool unless the spec's `agents` list
names them. Run pages record thoughts and tool calls from this catalog — do
not add a second tool-name map, event kind, or `onStepFinish` branch.

## Steps

1. Add one entry to `assistantToolSpecs` in `packages/ai/src/tools/specs.ts`.
   The capability id union, per-agent allowlists (`capabilitiesForAgent`),
   and card lookup all derive from it.

   ```ts
   'trip.thing.propose': {
     agents: ['groam', 'issue'],
     eventLabel: { complete: 'Proposed thing', running: 'Proposing thing' },
     guidance: 'Call proposeThing when the traveler asks to …',
     toolName: 'proposeThing',
     ui: { card: 'activity' }, // 'activity' | 'choice' | 'hidden'
     writeIntent: ['propose', 'suggest']
   },
   ```

   - Read-only tools omit `writeIntent`; `eventLabel` is then optional and
     falls back to the humanized tool name (`getItinerary` → "Read
     itinerary").
   - Write tools must set `writeIntent` (and optional `writeIntentExact`)
     plus `eventLabel` — the type enforces it.

2. Add one binding to the `assistantCapabilityBindings` object in
   `packages/backend/assistant/tools/kinds/index.ts`, keyed by the same id.
   Spread the spec and add only the Convex-bound `create` closure (or
   `createToolSet` for provider tool sets). The
   `satisfies EnsureAllSpecsBound` check fails typecheck until every spec
   has exactly one binding.

   ```ts
   'trip.thing.propose': defineCapability({
     ...assistantToolSpecs['trip.thing.propose'],
     create: (runtime) => createProposeThingTool(runtime)
   }),
   ```

3. Implement `createProposeThingTool` in
   `packages/backend/assistant/tools/trips/<area>.ts` (with a colocated
   `<area>.test.ts`). Call an existing domain helper through an internal
   function; reauthorize on every write. Do not add a parallel executor.

4. Run `vp run typecheck` and `vp run test`.

## Recording

`AgentRunTracking.recordStep`
(`packages/backend/convex/modules/assistant/runs/tracking.ts`) writes
thoughts and tool results onto `agentRunEvents`; labels resolve through
`catalogToolLabel` in `packages/ai/src/backend/runs/tool-event.ts`. Chat,
issue, and reviewer loops already call it, so a new capability shows up on
`/agents/$agentId/$runId` with no UI or event-kind changes.

## Do not

- Teach the prompt to pick tools with keyword switches.
- Hand-edit frontend tool-name maps or add per-tool recording.
- Bypass `writeIntent` gating (`packages/backend/assistant/tools/index.ts`)
  for a write.
- Import `@groam/ai/ui/*` from tool execution. Screen capabilities are
  context, not a security filter — the LLM sees every tool its agent is
  allowed.
