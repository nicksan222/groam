import { type AssistantCapability, assistantAgents } from '@groam/ai/agents';
import { requestsWriteIntent } from '@groam/ai/tools/write-intent';
import type { ToolExecutionOptions, ToolSet } from 'ai';
import { ConvexError } from 'convex/values';
import type { AssistantTool, AssistantToolRuntime } from '#backend/assistant/tools/factory';
import { allAssistantTools, assistantToolSet } from '#backend/assistant/tools/kinds/index';
import type { Id } from '#convex-generated/dataModel';

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

type ConvexCall = (ref: unknown, args?: Record<string, unknown>) => Promise<unknown>;

type ToolCtx = {
  runAction?: ConvexCall;
  runMutation?: ConvexCall;
  runQuery?: ConvexCall;
};

function withRunActor<Ctx extends ToolCtx>(ctx: Ctx, runId: Id<'agentRuns'>): Ctx {
  const bind = (call: ConvexCall | undefined): ConvexCall | undefined =>
    call
      ? (ref: unknown, args: Record<string, unknown> = {}) => call(ref, { ...args, asRun: runId })
      : undefined;
  return {
    ...ctx,
    runAction: bind(ctx.runAction?.bind(ctx)),
    runMutation: bind(ctx.runMutation?.bind(ctx)),
    runQuery: bind(ctx.runQuery?.bind(ctx))
  };
}

/**
 * Convex tools read their ctx from `this.ctx`, which the Agent injects by spreading the tool.
 * Rebinding here keeps every tool file unaware of runs. Tools only call internal functions built
 * with actor-aware builders, so the extra `asRun` arg always validates; with a signed-in caller,
 * identity still wins over `asRun`.
 */
function bindRunActor(tool: AssistantTool, runId: Id<'agentRuns'>): AssistantTool {
  const execute = tool.execute;
  if (!execute) return tool;
  return {
    ...tool,
    execute(this: { ctx?: ToolCtx } | undefined, input: unknown, options: unknown) {
      const ctx = this?.ctx ?? (tool as { ctx?: ToolCtx }).ctx;
      const bound = ctx ? { ...this, ctx: withRunActor(ctx, runId) } : this;
      return (execute as (input: unknown, options: unknown) => unknown).call(bound, input, options);
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
  const actorRunId = runtime.actorRunId;
  const runTool = (tool: AssistantTool) => (actorRunId ? bindRunActor(tool, actorRunId) : tool);
  for (const [toolName, tool] of Object.entries(created)) {
    if (tools[toolName]) throw new ConvexError(`Duplicate assistant runtime tool: ${toolName}`);
    tools[toolName] = writeAllowed ? runTool(tool) : denyUnrequestedWrite(toolName, tool);
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
