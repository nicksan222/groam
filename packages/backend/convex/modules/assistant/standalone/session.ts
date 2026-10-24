import { Agent } from '@convex-dev/agent';
import { ideaReviewSchema } from '@groam/ai/backend/review/schema';
import { issueStandalonePrompt, issueStandaloneScreen } from '@groam/ai/backend/standalone/issue';
import {
  reviewStandalonePrompt,
  reviewStandaloneScreen
} from '@groam/ai/backend/standalone/review';
import type { AssistantScreen } from '@groam/ai/runtime/screen';
import { Output, stepCountIs } from 'ai';
import { ConvexError } from 'convex/values';
import { endedInWait, stopAfterWait } from '#backend/assistant/tools/agent/stop';
import { createRegisteredAssistantTools } from '#backend/assistant/tools/index';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { AssistantInstructions } from '#convex/modules/assistant/agent/instructions';
import { ResearchSession } from '#convex/modules/assistant/research/session';
import type { AgentRunView } from '#convex/modules/assistant/runs/schema';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { AssistantScreens } from '#convex/modules/assistant/screen/index';

const MAX_ISSUE_OUTPUT_TOKENS = 2_048;
const MAX_REVIEW_OUTPUT_TOKENS = 2_048;

async function generateStandalone(
  ctx: ActionCtx,
  run: AgentRunView,
  args: {
    maxOutputTokens: number;
    organizationId: string;
    prompt: string;
    screen: AssistantScreen;
    tripId: Id<'trips'>;
  }
) {
  AssistantScreens.validate(args.screen);
  const configuration = await AssistantProvider.configured(ctx, {
    organizationId: args.organizationId,
    userId: run.createdBy.userId
  });
  const registered = createRegisteredAssistantTools({
    activeTripId: args.tripId,
    agentId: run.agentId,
    prompt: args.prompt,
    screen: args.screen,
    scope: 'standalone',
    ...(run.issueId ? { issueId: run.issueId } : {}),
    actorRunId: run.id,
    runId: run.id,
    ...(configuration.providerTools ? { providerTools: configuration.providerTools } : {})
  });
  const assistant = new Agent(components.agent, {
    callSettings: { maxOutputTokens: args.maxOutputTokens },
    contextOptions: { excludeToolMessages: true, recentMessages: 0 },
    instructions: AssistantInstructions.for(run.agentId, 'standalone', registered.guidance),
    languageModel: configuration.languageModel,
    name: run.agentId,
    stopWhen: [stepCountIs(12), stopAfterWait],
    tools: registered.tools
  });
  return assistant;
}

/**
 * Standalone runs save no thread messages, so a resumed turn rebuilds its prompt: the original
 * task, why it woke up, and what it reported before suspending.
 */
function resumedPrompt(task: string, run: AgentRunView, resumeNote: string | undefined): string {
  if (!resumeNote) return task;
  const reported = run.report?.trim();
  return reported
    ? `${task}\n\n${resumeNote}\n\nYour report so far: ${reported}`
    : `${task}\n\n${resumeNote}`;
}

async function executeIssue(
  ctx: ActionCtx,
  run: AgentRunView,
  resumeNote: string | undefined
): Promise<string> {
  if (!run.issueId || !run.tripId) throw new ConvexError('Issue run is missing its target');
  const issue = await ctx.runQuery(internal.modules.assistant.standalone.context.issue, {
    issueId: run.issueId
  });
  const prompt = resumedPrompt(issueStandalonePrompt(issue), run, resumeNote);
  const assistant = await generateStandalone(ctx, run, {
    maxOutputTokens: MAX_ISSUE_OUTPUT_TOKENS,
    organizationId: issue.organizationId,
    prompt,
    screen: issueStandaloneScreen(issue),
    tripId: run.tripId
  });
  await AgentRunTracking.record(ctx, run.id, {
    detail: issue.title,
    kind: 'status',
    label: 'Started working on this issue'
  });
  const result = await assistant.generateText(
    ctx,
    { userId: run.createdBy.userId },
    {
      onStepFinish: async (step) => {
        await AgentRunTracking.recordStep(ctx, run.id, step);
      },
      prompt
    },
    { storageOptions: { saveMessages: 'none' } }
  );
  return await issueReportFromResult(ctx, run, result);
}

async function issueReportFromResult(
  ctx: ActionCtx,
  run: AgentRunView,
  result: {
    steps: ReadonlyArray<{
      toolCalls: ReadonlyArray<unknown>;
      toolResults: ReadonlyArray<{ output?: unknown }>;
    }>;
    text: string;
  }
): Promise<string> {
  // Suspending on a wait is not a finished report; the resumed turn writes that.
  if (endedInWait(result.steps)) return result.text.trim();
  const attached = await ctx.runQuery(internal.modules.assistant.runs.functions.getInternal, {
    runId: run.id
  });
  const text = result.text.trim();
  const calledTools = result.steps.some((step) => step.toolCalls.length > 0);
  // An empty reply with no tool work means the provider returned nothing: fail, don't report success.
  if (!text && !calledTools && !attached?.proposalId) {
    throw new ConvexError(
      'The agent returned nothing. Try again, or check your ChatGPT connection.'
    );
  }
  const report =
    text ||
    (attached?.proposalId
      ? 'Started a draft idea for this issue. Review and apply it when you are ready.'
      : 'Finished working on this issue.');
  await AgentRunTracking.record(ctx, run.id, {
    detail: report.slice(0, 500),
    kind: 'report',
    label: 'Report ready'
  });
  return report;
}

async function executeReview(
  ctx: ActionCtx,
  run: AgentRunView,
  resumeNote: string | undefined
): Promise<{ commentCount: number; summary: string }> {
  if (!run.proposalId) throw new ConvexError('Review run is missing its idea');
  const context = await ctx.runQuery(internal.modules.travel.versions.agent.review.index.context, {
    proposalId: run.proposalId
  });
  const prompt = resumedPrompt(
    reviewStandalonePrompt({
      changes: context.changes,
      sourceTripId: context.sourceTripId,
      title: context.title,
      workingTripId: context.workingTripId
    }),
    run,
    resumeNote
  );
  const assistant = await generateStandalone(ctx, run, {
    maxOutputTokens: MAX_REVIEW_OUTPUT_TOKENS,
    organizationId: context.organizationId,
    prompt,
    screen: reviewStandaloneScreen({
      changes: context.changes,
      id: run.proposalId,
      sourceTripId: context.sourceTripId,
      title: context.title,
      workingTripId: context.workingTripId
    }),
    tripId: context.workingTripId
  });
  await AgentRunTracking.record(ctx, run.id, {
    detail: context.title,
    kind: 'status',
    label: 'Reviewing idea'
  });
  const result = await assistant.generateText(
    ctx,
    { userId: run.createdBy.userId },
    {
      onStepFinish: async (step) => {
        await AgentRunTracking.recordStep(ctx, run.id, step);
      },
      output: Output.object({ schema: ideaReviewSchema }),
      prompt
    },
    { storageOptions: { saveMessages: 'none' } }
  );
  if (await AgentRunTracking.isAborted(ctx, run.id)) {
    throw new ConvexError('Agent run aborted');
  }
  const output = result.output;
  if (!output) throw new ConvexError('Idea reviewer did not return a review');
  await ctx.runMutation(internal.modules.travel.versions.agent.review.index.finish, {
    comments: output.comments,
    expectedReviewRevision: context.expectedReviewRevision,
    proposalId: run.proposalId,
    runId: run.id,
    summary: output.summary,
    verdict: output.verdict
  });
  await AgentRunTracking.record(ctx, run.id, {
    detail: output.summary,
    kind: 'report',
    label: 'Review complete'
  });
  return { commentCount: output.comments.length, summary: output.summary };
}

export type StandaloneTurn = {
  report: string;
  /** Set for idea reviews: what the reviewer stored on the idea. */
  review: { commentCount: number; summary: string } | null;
};

/** One standalone turn. The engine claims and finishes the run around it and owns errors. */
async function turn(
  ctx: ActionCtx,
  run: AgentRunView,
  resumeNote?: string
): Promise<StandaloneTurn> {
  if (run.researchTask)
    return { report: (await ResearchSession.execute(ctx, run)).report, review: null };
  if (run.issueId) return { report: await executeIssue(ctx, run, resumeNote), review: null };
  if (run.proposalId) {
    const review = await executeReview(ctx, run, resumeNote);
    return { report: review.summary, review };
  }
  throw new ConvexError('Standalone run is missing a target');
}

/** Standalone workers: live event log + report, no chat or issue-comment dumps. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class StandaloneSession {
  static resumedPrompt = resumedPrompt;
  static turn = turn;
}
