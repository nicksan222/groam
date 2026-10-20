import { Agent } from '@convex-dev/agent';
import { researchPolicy, researchPrompt } from '@groam/ai/backend/research';
import { stepCountIs } from 'ai';
import { ConvexError } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { researchSearch } from '#convex/modules/assistant/research/search';
import type { AgentRunView } from '#convex/modules/assistant/runs/schema';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';

type ResearchResult = {
  report: string;
  sources: { url: string; title: string }[];
  incomplete: boolean;
};

/** Dedicated read-only agent: its only tool is hosted web search. */
async function execute(ctx: ActionCtx, run: AgentRunView): Promise<ResearchResult> {
  const task = run.researchTask;
  if (!task || !run.tripId) throw new ConvexError('Research run is missing its topic');
  const { context, organizationId } = await ctx.runQuery(
    internal.modules.assistant.research.functions.context,
    {
      runId: run.id,
      asRun: run.id
    }
  );
  const policy = researchPolicy(task.effort);
  const configuration = await AssistantProvider.configured(
    ctx,
    {
      organizationId,
      userId: run.createdBy.userId
    },
    { research: { searchContextSize: policy.searchContextSize } }
  );
  const webSearch = configuration.providerTools?.web_search;
  if (!webSearch) throw new ConvexError('Web search is unavailable for this ChatGPT connection');
  const web = researchSearch(ctx, {
    runId: run.id,
    model: configuration.languageModel,
    webSearch,
    maxSearches: policy.maxSearches
  });
  const assistant = new Agent(components.agent, {
    name: 'researcher',
    languageModel: configuration.languageModel,
    instructions:
      'You are the trip researcher. Plan subquestions, call researchWeb to investigate, inspect its evidence and follow up on gaps, then synthesize a useful cited report. You have no write or delegation tools.',
    contextOptions: { excludeToolMessages: false, recentMessages: 0 },
    tools: { researchWeb: web.tool },
    stopWhen: stepCountIs(policy.maxSteps)
  });
  await AgentRunTracking.record(ctx, run.id, {
    kind: 'status',
    label: 'Researching the web',
    detail: `${task.effort}: ${task.topic}`
  });
  const result = await assistant.generateText(
    ctx,
    { userId: run.createdBy.userId },
    {
      prompt: researchPrompt({ ...task, context, date: new Date().toISOString().slice(0, 10) }),
      providerOptions: { openai: { parallelToolCalls: false } },
      prepareStep: async ({ stepNumber }) => {
        if (
          !(await ctx.runQuery(internal.modules.assistant.research.functions.active, {
            runId: run.id
          }))
        )
          throw new ConvexError('Research run or parent agent was stopped');
        if (stepNumber === 0) return { toolChoice: 'required' as const };
        if (web.count() >= policy.maxSearches || stepNumber >= policy.maxSteps - 1)
          return { toolChoice: 'none' as const };
        return {};
      },
      onStepFinish: (step) => AgentRunTracking.recordStep(ctx, run.id, step)
    },
    { storageOptions: { saveMessages: 'none' } }
  );
  if (await AgentRunTracking.isAborted(ctx, run.id)) throw new ConvexError('Agent run aborted');
  const searches = web.count();
  if (web.completed() === 0)
    throw new ConvexError('The researcher did not search the web. Try again.');
  const sources = web.sources();
  const text = result.text.trim();
  if (!text) throw new ConvexError('The researcher did not produce a report. Try again.');
  const incomplete =
    sources.length === 0 ||
    searches >= policy.maxSearches ||
    result.steps.length >= policy.maxSteps;
  const report = [
    text,
    incomplete
      ? '_Research coverage is limited: source evidence was unavailable or the research budget was reached._'
      : '',
    sources.length
      ? `## Sources\n\n${sources.map((source, index) => `${index + 1}. [${source.title.replaceAll(/[[\]\\]/g, '')}](<${source.url}>)`).join('\n')}`
      : 'No verifiable source citations were returned. Treat this report as incomplete.'
  ]
    .filter(Boolean)
    .join('\n\n');
  await ctx.runMutation(internal.modules.assistant.research.functions.saveResult, {
    runId: run.id,
    result: { sources, incomplete }
  });
  await AgentRunTracking.record(ctx, run.id, {
    kind: 'report',
    label: 'Research report ready',
    detail: `${sources.length} sources${incomplete ? '; limited coverage' : ''}`
  });
  return { report, sources, incomplete };
}

async function inline(ctx: ActionCtx, runId: Id<'agentRuns'>): Promise<ResearchResult | null> {
  const run = await ctx.runMutation(internal.modules.assistant.engine.functions.claimInline, {
    runId
  });
  if (!run) return null;
  try {
    const result = await execute(ctx, run);
    if (await AgentRunTracking.isAborted(ctx, runId)) return null;
    const finished = await ctx.runMutation(internal.modules.assistant.research.functions.finish, {
      runId,
      report: result.report
    });
    return finished ? result : null;
  } catch (error) {
    if (await AgentRunTracking.isAborted(ctx, runId)) return null;
    if (!(await ctx.runQuery(internal.modules.assistant.research.functions.active, { runId }))) {
      await ctx.runMutation(internal.modules.assistant.engine.functions.finishInline, {
        runId,
        status: 'aborted'
      });
      return null;
    }
    await ctx.runMutation(internal.modules.assistant.engine.functions.finishInline, {
      runId,
      error: AssistantErrors.message(error),
      status: 'failed'
    });
    throw error;
  }
}

// oxlint-disable-next-line unicorn/no-static-only-class -- Existing session facade convention.
export class ResearchSession {
  static execute = execute;
  static inline = inline;
}
