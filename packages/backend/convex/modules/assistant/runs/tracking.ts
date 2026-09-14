import { eventsFromStep } from '@groam/ai-contracts/agents/runs';
import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';

type EventKind = 'error' | 'report' | 'status' | 'thought' | 'tool';
type ToolStepResult = {
  args?: unknown;
  error?: unknown;
  input?: unknown;
  isError?: boolean;
  output?: unknown;
  result?: unknown;
  toolName?: string;
  type?: string;
};

async function record(
  ctx: ActionCtx,
  runId: Id<'agentRuns'>,
  kind: EventKind,
  label: string,
  detail?: string
) {
  await ctx.runMutation(internal.modules.assistant.runs.functions.recordEvent, {
    kind,
    label,
    runId,
    ...(detail ? { detail } : {})
  });
}

async function isAborted(ctx: ActionCtx, runId: Id<'agentRuns'>) {
  const run = await ctx.runQuery(internal.modules.assistant.runs.functions.getInternal, { runId });
  return run?.status === 'aborted';
}

async function recordToolResults(
  ctx: ActionCtx,
  runId: Id<'agentRuns'>,
  toolResults: readonly ToolStepResult[]
) {
  await recordStep(ctx, runId, { toolResults });
}

async function recordStep(
  ctx: ActionCtx,
  runId: Id<'agentRuns'>,
  step: {
    content?: unknown;
    reasoning?: unknown;
    reasoningText?: unknown;
    text?: unknown;
    toolCalls?: unknown;
    toolResults?: unknown;
  }
) {
  if (await isAborted(ctx, runId)) throw new ConvexError('Agent run aborted');
  const events = eventsFromStep(step);
  if (events.length === 0) return;
  await ctx.runMutation(internal.modules.assistant.runs.functions.recordStepEvents, {
    events,
    runId
  });
}

/** Action-side event log for every agent run — chat and standalone. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AgentRunTracking {
  static isAborted = isAborted;
  static record = record;
  static recordStep = recordStep;
  static recordToolResults = recordToolResults;
}
