import { type AssistantCapability, assistantAgents } from '@groam/ai/agents';
import { requestsWriteIntent } from '@groam/ai/tools/write-intent';
import type { ToolExecutionOptions, ToolSet } from 'ai';
import { ConvexError } from 'convex/values';
import type { AssistantTool, AssistantToolRuntime } from '#backend/assistant/tools/factory';
import { allAssistantTools, assistantToolSet } from '#backend/assistant/tools/kinds/index';

export type { AssistantToolRuntime } from '#backend/assistant/tools/factory';

// Write-intent policy lives in `@groam/ai/tools/write-intent` next to the
// specs that declare each tool's phrases. The model still sees and selects
// every allowed tool; an unrequested write fails closed instead of mutating.

function denyUnrequestedWrite(name: string, tool: AssistantTool): AssistantTool {
  if (!tool.execute) return tool;
  return {
    ...tool,
    execute: async (_input: unknown, _options: ToolExecutionOptions<unknown>) => {
      throw new ConvexError(`${name} requires an explicit traveler request`);
    }
  } as AssistantTool;
}

type AssistantCapabilityBinding = ReturnType<typeof allAssistantTools>[number];

function collectAssistantTool(
  tools: ToolSet,
  guidance: string[],
  runtime: AssistantToolRuntime,
  registration: AssistantCapabilityBinding
): void {
  if (registration.guidance) guidance.push(registration.guidance);
  const created = assistantToolSet(registration, runtime);
  if (!created) return;
  const writeAllowed =
    runtime.scope === 'standalone' ||
    !(registration.writeIntent || registration.writeIntentExact) ||
    requestsWriteIntent(
      runtime.prompt,
      registration.writeIntent ?? [],
      registration.writeIntentExact ?? []
    );
  for (const [toolName, tool] of Object.entries(created)) {
    if (tools[toolName]) throw new ConvexError(`Duplicate assistant runtime tool: ${toolName}`);
    tools[toolName] = writeAllowed ? tool : denyUnrequestedWrite(toolName, tool);
  }
}

/**
 * Builds the runtime tool set from the invoked agent's capabilities. Outside
 * this folder, use this facade — do not import the kind map.
 */
export function createRegisteredAssistantTools(runtime: AssistantToolRuntime): {
  guidance: string[];
  tools: ToolSet;
} {
  const allowed = new Set<AssistantCapability>(assistantAgents[runtime.agentId].capabilities);
  const guidance: string[] = [];
  const tools: ToolSet = {};
  for (const registration of allAssistantTools()) {
    if (!allowed.has(registration.id as AssistantCapability)) continue;
    collectAssistantTool(tools, guidance, runtime, registration);
  }
  return { guidance, tools };
}
