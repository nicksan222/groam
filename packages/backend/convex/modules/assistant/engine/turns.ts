import type { ChatAgentId } from '@groam/ai/agents';
import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { AssistantSession } from '#convex/modules/assistant/agent/index';
import {
  isConnectionError,
  RECONNECT_CHATGPT_LABEL,
  resumeFallbackNote,
  resumeNote,
  type TurnResult,
  type WaitResume
} from '#convex/modules/assistant/engine/schema';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import type { AgentRunView } from '#convex/modules/assistant/runs/schema';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { StandaloneSession, type StandaloneTurn } from '#convex/modules/assistant/standalone/index';

/** Why a resumed turn woke up, as the hidden note the model reads. Null on a first turn. */
async function noteFor(ctx: ActionCtx, resume: WaitResume | undefined): Promise<string | null> {
  if (!resume) return null;
  const context = await ctx.runQuery(internal.modules.assistant.waits.functions.resumeContext, {
    waitId: resume.waitId as Id<'agentWaits'>
  });
  if (!context?.outcome) return resumeFallbackNote(resume.reason);
  return resumeNote({ kind: context.kind, outcome: context.outcome });
}

/** The prompt a chat turn answers: the claimed discussion request, or a resume note. */
async function chatPrompt(
  ctx: ActionCtx,
  run: AgentRunView,
  stored: { promptMessageId: string | null },
  note: string | null
): Promise<{ agent: ChatAgentId; prompt: string; promptMessageId: string }> {
  if (!run.threadId || !run.discussionId) {
    throw new ConvexError('Discussion run is missing its prompt');
  }
  if (note !== null) {
    const promptMessageId = await AssistantSession.saveResumeNote(ctx, run.threadId, note);
    return { agent: run.agentId as ChatAgentId, prompt: note, promptMessageId };
  }
  if (!stored.promptMessageId) throw new ConvexError('Discussion run is missing its prompt');
  const request = await ctx.runQuery(internal.modules.discussions.assistant.index.prompt, {
    discussionId: run.discussionId,
    promptMessageId: stored.promptMessageId
  });
  return { agent: request.agent, prompt: request.prompt, promptMessageId: stored.promptMessageId };
}

async function chatTurn(
  ctx: ActionCtx,
  run: AgentRunView,
  note: string | null
): Promise<TurnResult> {
  const stored = await ctx.runQuery(internal.modules.assistant.engine.functions.turnContext, {
    runId: run.id
  });
  if (!run.threadId || !stored.screen) {
    throw new ConvexError('Discussion run is missing its prompt');
  }
  const { agent, prompt, promptMessageId } = await chatPrompt(ctx, run, stored, note);
  const reply = await AssistantSession.continueDiscussion(
    ctx,
    { agent, prompt, screen: stored.screen, threadId: run.threadId },
    promptMessageId,
    run.id
  );
  if (reply === null || (await AgentRunTracking.isAborted(ctx, run.id))) return { kind: 'aborted' };
  // Blank replies (tool calls only) stay blank: finishing the request reports them as empty.
  await ctx.runMutation(internal.modules.assistant.engine.functions.recordReply, {
    runId: run.id,
    text: reply.trim()
  });
  return { kind: 'done' };
}

async function standaloneTurn(
  ctx: ActionCtx,
  run: AgentRunView,
  note: string | null
): Promise<TurnResult> {
  const { report } = await StandaloneSession.turn(ctx, run, note ?? undefined);
  if (await AgentRunTracking.isAborted(ctx, run.id)) return { kind: 'aborted' };
  await ctx.runMutation(internal.modules.assistant.engine.functions.recordReply, {
    runId: run.id,
    text: report
  });
  return { kind: 'done' };
}

/**
 * Records the failure and returns the run's error. A resumed turn whose creator's ChatGPT
 * connection is gone asks for a reconnect instead of a generic failure.
 */
async function failTurn(
  ctx: ActionCtx,
  run: AgentRunView,
  error: unknown,
  resumed = false
): Promise<string> {
  const message = AssistantErrors.message(error);
  const reconnect = resumed && isConnectionError(message);
  console.error(
    run.surface === 'chat'
      ? 'discussion assistant respond failed:'
      : 'standalone agent run failed:',
    message,
    error
  );
  await AgentRunTracking.record(ctx, run.id, {
    detail: message,
    kind: 'error',
    label: reconnect ? RECONNECT_CHATGPT_LABEL : 'Run failed'
  });
  return reconnect ? RECONNECT_CHATGPT_LABEL : message;
}

/** Action-side body of one workflow turn. Never throws for model or tool failures. */
async function run(
  ctx: ActionCtx,
  { resume, runId }: { resume?: WaitResume; runId: Id<'agentRuns'> }
): Promise<TurnResult> {
  const claimed = await ctx.runMutation(internal.modules.assistant.engine.functions.claimTurn, {
    runId
  });
  if (!claimed) return { kind: 'aborted' };
  try {
    const note = await noteFor(ctx, resume);
    const result =
      claimed.surface === 'chat'
        ? await chatTurn(ctx, claimed, note)
        : await standaloneTurn(ctx, claimed, note);
    if (result.kind !== 'done') return result;
    // A `waitFor` in this turn suspends the run until its event; otherwise the run is done.
    const suspended = await ctx.runMutation(internal.modules.assistant.engine.functions.suspend, {
      runId
    });
    return suspended ? { eventId: suspended.eventId, kind: 'wait' } : result;
  } catch (error: unknown) {
    if (await AgentRunTracking.isAborted(ctx, runId)) return { kind: 'aborted' };
    return { error: await failTurn(ctx, claimed, error, resume !== undefined), kind: 'failed' };
  }
}

/**
 * Runs a queued standalone run in the calling action and finishes it there (manual idea review
 * answers its caller). Returns null when the run was not claimed or was stopped.
 */
async function runInline(
  ctx: ActionCtx,
  runId: Id<'agentRuns'>
): Promise<StandaloneTurn['review'] | null> {
  const claimed = await ctx.runMutation(internal.modules.assistant.engine.functions.claimInline, {
    runId
  });
  if (!claimed) return null;
  try {
    const { report, review } = await StandaloneSession.turn(ctx, claimed);
    if (await AgentRunTracking.isAborted(ctx, runId)) return null;
    await ctx.runMutation(internal.modules.assistant.engine.functions.finishInline, {
      report,
      runId,
      status: 'complete'
    });
    return review;
  } catch (error: unknown) {
    if (await AgentRunTracking.isAborted(ctx, runId)) return null;
    await ctx.runMutation(internal.modules.assistant.engine.functions.finishInline, {
      error: await failTurn(ctx, claimed, error),
      runId,
      status: 'failed'
    });
    return null;
  }
}

/** Action-side turns of agent runs. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentTurns {
  static run = run;
  static runInline = runInline;
}
