---
name: add-agent-capability
description: >-
  Add a new Groam assistant tool/capability that agents can call. Use when
  introducing a tool, write intent, Convex-backed agent action, or
  defineCapability binding — not when only adding an agent identity
  (use add-assistant-agent).
---

# Add an agent capability

Start with `packages/ai/src/tools/specs.ts`: tool ids, allowed agents, prompt
guidance, UI presentation, write intent, and event labels derive from this
catalog. Read a nearby entry and its types for the current fields; do not copy
a remembered agent roster or tool shape.

1. Add the spec, granting it only to the intended agents. Writes must participate
   in the existing write-intent gate; read-only tools must not acquire write intent.
2. Find `assistantCapabilityBindings` in
   `packages/backend/assistant/tools/kinds/index.ts` and follow a comparable binding.
   Read its factory and completeness checks before implementing the execution helper.
3. Reuse domain helpers through internal functions and reauthorize writes in the
   backend. Screen capabilities are context hints, never authorization.
4. Follow nearby capability tests for tool results, denied writes, and persistence.
   Discover focused test and typecheck commands in the package manifests.

For recording, trace `AgentRunTracking.recordStep` from
`packages/backend/convex/modules/assistant/runs/tracking.ts` and
`catalogToolLabel` in `packages/ai/src/backend/runs/tool-event.ts`.
Extend the catalog rather than adding a second tool-name map, executor, event kind,
or per-tool recording branch. Keep UI imports out of execution code.
