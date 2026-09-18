import { Agent } from '@convex-dev/agent';
import { ideaReviewSchema } from '@groam/ai-contracts/agents/review/schema';
import type { AssistantScreen } from '@groam/ai-contracts/agents/screen';
import {
  issueStandalonePrompt,
  issueStandaloneScreen
} from '@groam/ai-contracts/agents/standalone/issue';
import {
  reviewStandalonePrompt,
  reviewStandaloneScreen
} from '@groam/ai-contracts/agents/standalone/review';
import { Output, stepCountIs } from 'ai';
import { ConvexError } from 'convex/values';
import { createRegisteredAssistantTools } from '#backend/assistant/tools/index';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { AssistantInstructions } from '#convex/modules/assistant/agent/instructions';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import type { AgentRunView } from '#convex/modules/assistant/runs/schema';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { AssistantScreens } from '#convex/modules/assistant/screen/index';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';

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
  const configuration = await AssistantProvider.configured(ctx, run.agentId, {
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
    runId: run.id,
    ...(configuration.providerTools ? { providerTools: configuration.providerTools } : {})
  });
  const assistant = new Agent(components.agent, {
    callSettings: { maxOutputTokens: args.maxOutputTokens },
    contextOptions: { excludeToolMessages: true, recentMessages: 0 },
    instructions: AssistantInstructions.for(run.agentId, 'standalone', registered.guidance),
    languageModel: configuration.languageModel,
    name: run.agentId,
    stopWhen: stepCountIs(12),
    tools: registered.tools
  });
  return assistant;
}

async function executeIssue(ctx: ActionCtx, run: AgentRunView): Promise<string> {
  if (!run.issueId || !run.tripId) throw new ConvexError('Issue run is missing its target');
  const issue = await ctx.runQuery(internal.modules.assistant.standalone.context.issue, {
    issueId: run.issueId
  });
  const prompt = issueStandalonePrompt(issue);
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
  result: { text: string }
): Promise<string> {
  const attached = await ctx.runQuery(internal.modules.assistant.runs.functions.getInternal, {
    runId: run.id
  });
  const report =
    result.text.trim() ||
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
  run: AgentRunView
): Promise<{ commentCount: number; summary: string }> {
  if (!run.proposalId) throw new ConvexError('Review run is missing its idea');
  const context = await ctx.runQuery(internal.modules.travel.versions.agent.review.index.context, {
    proposalId: run.proposalId
  });
  const prompt = reviewStandalonePrompt({
    changes: context.changes,
    sourceTripId: context.sourceTripId,
    title: context.title,
    workingTripId: context.workingTripId
  });
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
    proposalId: run.proposalId,
    summary: output.summary
  });
  await AgentRunTracking.record(ctx, run.id, {
    detail: output.summary,
    kind: 'report',
    label: 'Review complete'
  });
  return { commentCount: output.comments.length, summary: output.summary };
}

async function execute(
  ctx: ActionCtx,
  runId: Id<'agentRuns'>
): Promise<{ commentCount: number; summary: string } | null> {
  const claimed = await ctx.runMutation(internal.modules.assistant.runs.functions.claimRun, {
    runId
  });
  if (!claimed) return null;
  try {
    let report: string;
    let review: { commentCount: number; summary: string } | null = null;
    if (claimed.issueId) {
      report = await executeIssue(ctx, claimed);
    } else if (claimed.proposalId) {
      review = await executeReview(ctx, claimed);
      report = review.summary;
    } else {
      throw new ConvexError('Standalone run is missing a target');
    }
    if (await AgentRunTracking.isAborted(ctx, runId)) return null;
    await ctx.runMutation(internal.modules.assistant.runs.functions.finishRun, {
      report,
      runId,
      status: 'complete'
    });
    return review;
  } catch (error: unknown) {
    if (await AgentRunTracking.isAborted(ctx, runId)) return null;
    const message = AssistantErrors.message(error);
    console.error('standalone agent run failed:', message, error);
    await AgentRunTracking.record(ctx, runId, {
      detail: message,
      kind: 'error',
      label: 'Run failed'
    });
    await ctx.runMutation(internal.modules.assistant.runs.functions.finishRun, {
      error: message,
      runId,
      status: 'failed'
    });
    return null;
  }
}

/** Standalone workers: live event log + report, no chat or issue-comment dumps. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class StandaloneSession {
  static execute = execute;
}
