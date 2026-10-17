import { Agent, saveMessage, updateThreadMetadata } from '@convex-dev/agent';
import { type AssistantAgentId, isDefaultAssistantChatTitle } from '@groam/ai/agents';
import type { ResearchInstructionContext } from '@groam/ai/backend/instructions';
import { type AssistantScreen, assistantConversationContextKey } from '@groam/ai/runtime/screen';
import {
  assistantThreadSummary,
  parseAssistantThreadSummary
} from '@groam/ai/runtime/thread-summary';
import { stepCountIs } from 'ai';
import { ConvexError } from 'convex/values';
import { stopAfterWait } from '#backend/assistant/tools/agent/stop';
import { createRegisteredAssistantTools } from '#backend/assistant/tools/index';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { type ActionCtx } from '#convex-generated/server';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { AssistantChats } from '#convex/modules/assistant/chat/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { AssistantScreens } from '#convex/modules/assistant/screen/index';
import type { AgentWaitView } from '#convex/modules/assistant/waits/schema';
import { AssistantInstructions } from './instructions';
import {
  type AssistantConfiguration,
  type AssistantConversationScope,
  type AssistantLanguageModel,
  type AssistantTarget,
  AssistantTargets
} from './types';

const MAX_PROMPT_LENGTH = 5_000;

class EmptyReplyError extends Error {
  constructor() {
    super('The assistant returned nothing. Try again, or check your ChatGPT connection.');
  }
}

function chatScreenContext(screenContext: string) {
  try {
    const parsed = JSON.parse(screenContext) as Partial<AssistantScreen>;
    if (
      typeof parsed.key !== 'string' ||
      !parsed.target ||
      (parsed.target.kind !== 'workspace' && parsed.target.kind !== 'trip')
    ) {
      return null;
    }
    return { contextKey: assistantConversationContextKey(parsed as AssistantScreen) };
  } catch {
    return null;
  }
}

type CreateAssistantOptions = {
  /** Run whose creator the tools act for; a workflow turn has no signed-in caller. */
  actorRunId?: Id<'agentRuns'> | undefined;
  agentId: AssistantAgentId;
  configuration: AssistantConfiguration;
  /** Other runs in this chat that are suspended on a wait. */
  pendingWaits?: AgentWaitView[];
  prompt: string;
  research?: ResearchInstructionContext | null;
  scope: AssistantConversationScope;
  screen: AssistantTarget['screen'];
  threadId: string;
  tripId: Id<'trips'> | null;
};

function pendingWaitGuidance(waits: AgentWaitView[]): string {
  const listed = waits
    .map(
      (wait) =>
        `${wait.id} waits for ${wait.label}${wait.progress ? ` (${wait.progress})` : ''} until ${new Date(wait.deadlineAt).toISOString()}`
    )
    .join('; ');
  return `Pending waits in this chat (another run is waiting; mention them if relevant, cancel with cancelWait if they are no longer needed): ${listed}`;
}

function createAssistant({
  actorRunId,
  agentId,
  configuration,
  pendingWaits = [],
  prompt,
  research,
  scope,
  screen,
  threadId,
  tripId
}: CreateAssistantOptions) {
  const registered = createRegisteredAssistantTools({
    activeTripId: tripId,
    agentId,
    prompt,
    screen,
    scope,
    threadId,
    ...(actorRunId ? { actorRunId } : {}),
    ...(configuration.providerTools ? { providerTools: configuration.providerTools } : {})
  });
  const guidance =
    pendingWaits.length > 0
      ? [...registered.guidance, pendingWaitGuidance(pendingWaits)]
      : registered.guidance;
  return new Agent(components.agent, {
    contextOptions: { excludeToolMessages: false, recentMessages: 100 },
    instructions: AssistantInstructions.for(agentId, scope, guidance, research ?? undefined),
    languageModel: configuration.languageModel,
    name: agentId,
    stopWhen: [stepCountIs(8), stopAfterWait],
    tools: registered.tools
  });
}

async function workspaceAccess(
  ctx: ActionCtx,
  threadId?: string,
  scope: Exclude<AssistantConversationScope, 'standalone'> = 'private',
  asRun?: Id<'agentRuns'>
) {
  return await ctx.runQuery(internal.modules.assistant.model.index.access, {
    scope,
    ...(threadId ? { threadId } : {}),
    ...(asRun ? { asRun } : {})
  });
}

async function researchContext(
  ctx: ActionCtx,
  threadId: string,
  scope: Exclude<AssistantConversationScope, 'standalone'>,
  asRun?: Id<'agentRuns'>
) {
  if (scope !== 'discussion') return null;
  return await ctx.runQuery(internal.modules.discussions.research.tools.instructionContext, {
    threadId,
    ...(asRun ? { asRun } : {})
  });
}

/** Other runs suspended in this discussion, for the prompt; private chats have none. */
async function pendingWaitsFor(
  ctx: ActionCtx,
  threadId: string,
  scope: Exclude<AssistantConversationScope, 'standalone'>
): Promise<AgentWaitView[]> {
  if (scope !== 'discussion') return [];
  return await ctx.runQuery(internal.modules.assistant.waits.functions.pendingForThread, {
    threadId
  });
}

async function continueAssistantWithConfiguration(
  ctx: ActionCtx,
  target: AssistantTarget,
  configuration: AssistantConfiguration,
  options: {
    promptMessageId?: string;
    runId?: Id<'agentRuns'>;
    scope: Exclude<AssistantConversationScope, 'standalone'>;
  }
): Promise<string | null> {
  const prompt = target.prompt.trim();
  if (prompt.length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
    throw new ConvexError(`Messages must contain 1 to ${MAX_PROMPT_LENGTH} characters`);
  }
  AssistantScreens.validate(target.screen);
  const access = await workspaceAccess(ctx, target.threadId, options.scope, options.runId);
  const activeTripId = AssistantTargets.activeTripId(access.tags, target.screen);
  const [research, pendingWaits] = await Promise.all([
    researchContext(ctx, target.threadId, options.scope, options.runId),
    pendingWaitsFor(ctx, target.threadId, options.scope)
  ]);
  const assistant = createAssistant({
    actorRunId: options.runId,
    agentId: target.agent,
    configuration,
    pendingWaits,
    prompt,
    research,
    scope: options.scope,
    screen: target.screen,
    threadId: target.threadId,
    tripId: activeTripId
  });
  const promptMessageId = await savedPromptMessageId({
    access,
    assistant,
    ctx,
    prompt,
    promptMessageId: options.promptMessageId,
    screen: target.screen,
    threadId: target.threadId
  });
  // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- Persist the prompt before continuing its thread.
  const { thread } = await assistant.continueThread(ctx, {
    threadId: target.threadId,
    userId: access.userId
  });
  const runId = options.runId;
  if (runId) {
    await AgentRunTracking.record(ctx, runId, {
      detail: prompt.slice(0, 160),
      kind: 'status',
      label: 'Responding'
    });
  }
  let streamFailure: unknown;
  const result = await thread.streamText(
    {
      onError: (event) => {
        streamFailure =
          typeof event === 'object' && event !== null && 'error' in event ? event.error : event;
      },
      promptMessageId,
      ...(runId
        ? {
            onStepFinish: async (step) => {
              await AgentRunTracking.recordStep(ctx, runId, step);
            }
          }
        : {})
    },
    { saveStreamDeltas: { chunking: 'word', throttleMs: 100 } }
  );
  try {
    await result.consumeStream();
    if (runId && (await AgentRunTracking.isAborted(ctx, runId))) return null;
    // AI SDK 7 reports a mid-stream error chunk only through onError; the result still resolves.
    if (streamFailure !== undefined) throw streamFailure;
    const responseText = await completedReplyText(result);
    if (runId) {
      const report = responseText.trim() || 'Finished this discussion turn.';
      await AgentRunTracking.record(ctx, runId, {
        detail: report.slice(0, 500),
        kind: 'report',
        label: 'Report ready'
      });
    }
    return responseText;
  } catch (error: unknown) {
    if (isAbortError(error)) return null;
    if (error instanceof EmptyReplyError) throw new ConvexError(error.message);
    throw AssistantErrors.from(streamFailure ?? error);
  }
}

async function completedReplyText(result: {
  steps: PromiseLike<ReadonlyArray<{ toolCalls: ReadonlyArray<unknown> }>>;
  text: PromiseLike<string>;
}): Promise<string> {
  const responseText = await result.text;
  const madeToolCalls = (await result.steps).some((step) => step.toolCalls.length > 0);
  if (responseText.trim().length === 0 && !madeToolCalls) throw new EmptyReplyError();
  return responseText;
}

async function savedPromptMessageId({
  access,
  assistant,
  ctx,
  prompt,
  promptMessageId,
  screen,
  threadId
}: {
  access: Awaited<ReturnType<typeof workspaceAccess>>;
  assistant: ReturnType<typeof createAssistant>;
  ctx: ActionCtx;
  prompt: string;
  promptMessageId: string | undefined;
  screen: AssistantTarget['screen'];
  threadId: string;
}): Promise<string> {
  if (promptMessageId) return promptMessageId;
  const { messages } = await assistant.saveMessages(ctx, {
    messages: [{ content: prompt, role: 'user' }],
    skipEmbeddings: true,
    threadId,
    userId: access.userId
  });
  const savedMessageId = messages[messages.length - 1]?._id;
  if (!savedMessageId) throw new ConvexError('Unable to save the assistant message');
  const generatedTitle = generatedChatTitle(access.threadTitle, prompt);
  await updateThreadMetadata(ctx, components.agent, {
    patch: {
      summary: assistantThreadSummary(
        access.organizationId,
        access.tags,
        Date.now(),
        JSON.stringify(screen)
      ),
      ...(generatedTitle ? { title: generatedTitle } : {})
    },
    threadId
  });
  return savedMessageId;
}

function generatedChatTitle(threadTitle: string | null, prompt: string): string {
  if (!isDefaultAssistantChatTitle(threadTitle)) return '';
  return prompt
    .replace(/^\s*@[a-z][a-z-]*\s*/iu, '')
    .slice(0, 80)
    .trim();
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Action-side private and discussion assistant turns. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AssistantSession {
  static async open(
    ctx: ActionCtx,
    screen?: AssistantTarget['screen'],
    beforeCreate?: () => Promise<void>
  ): Promise<string> {
    const access = await workspaceAccess(ctx);
    const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      order: 'desc',
      paginationOpts: { cursor: null, numItems: 100 },
      userId: access.userId
    });
    const contextKey = screen ? assistantConversationContextKey(screen) : null;
    const existing = threads.page
      .flatMap((thread) => {
        const summary = parseAssistantThreadSummary(thread.summary);
        const savedScreen = summary?.screenContext
          ? chatScreenContext(summary.screenContext)
          : null;
        if (
          thread.status !== 'active' ||
          !summary ||
          summary.organizationId !== access.organizationId ||
          (contextKey !== null && savedScreen?.contextKey !== contextKey)
        ) {
          return [];
        }
        return [{ thread, updatedAt: summary.updatedAt ?? thread._creationTime }];
      })
      .sort((left, right) => right.updatedAt - left.updatedAt)[0]?.thread;
    if (existing) return existing._id;
    await beforeCreate?.();
    return await AssistantChats.create(ctx, screen);
  }

  static async continue(ctx: ActionCtx, target: AssistantTarget): Promise<null> {
    const access = await workspaceAccess(ctx, target.threadId);
    await continueAssistantWithConfiguration(
      ctx,
      target,
      await AssistantProvider.configured(ctx, {
        organizationId: access.organizationId,
        userId: access.credentialOwnerUserId
      }),
      { scope: 'private' }
    );
    return null;
  }

  static async resend(
    ctx: ActionCtx,
    target: AssistantTarget & { messageId: string; order: number; stepOrder: number }
  ): Promise<null> {
    const access = await workspaceAccess(ctx, target.threadId);
    const configuration = await AssistantProvider.configured(ctx, {
      organizationId: access.organizationId,
      userId: access.credentialOwnerUserId
    });
    const activeTripId = AssistantTargets.activeTripId(access.tags, target.screen);
    const assistant = createAssistant({
      agentId: target.agent,
      configuration,
      prompt: target.prompt,
      scope: 'private',
      screen: target.screen,
      threadId: target.threadId,
      tripId: activeTripId
    });
    const [promptMessage] = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
      messageIds: [target.messageId]
    });
    if (
      !promptMessage ||
      promptMessage.threadId !== target.threadId ||
      promptMessage.message?.role !== 'user' ||
      promptMessage.order !== target.order ||
      promptMessage.stepOrder !== target.stepOrder ||
      promptMessage.text?.trim() !== target.prompt.trim()
    ) {
      throw new ConvexError('The selected assistant message cannot be resent');
    }
    let startOrder = target.order;
    let startStepOrder: number | undefined = target.stepOrder + 1;
    while (true) {
      const deleted = await assistant.deleteMessageRange(ctx, {
        endOrder: Number.MAX_SAFE_INTEGER,
        ...(startStepOrder === undefined ? {} : { startStepOrder }),
        startOrder,
        threadId: target.threadId
      });
      if (deleted.isDone) break;
      if (deleted.lastOrder === undefined)
        throw new ConvexError('Unable to clear assistant messages');
      startOrder = deleted.lastOrder;
      startStepOrder = deleted.lastStepOrder;
    }
    await continueAssistantWithConfiguration(ctx, target, configuration, {
      promptMessageId: target.messageId,
      scope: 'private'
    });
    return null;
  }

  static async continueWithModel(
    ctx: ActionCtx,
    target: AssistantTarget,
    languageModel: AssistantLanguageModel
  ): Promise<null> {
    await continueAssistantWithConfiguration(ctx, target, { languageModel }, { scope: 'private' });
    return null;
  }

  /** Writes the hidden resume note; returns its message id to use as the prompt. */
  static async saveResumeNote(ctx: ActionCtx, threadId: string, note: string): Promise<string> {
    const { messageId } = await saveMessage(ctx, components.agent, {
      message: { content: note, role: 'system' },
      threadId
    });
    return messageId;
  }

  static async continueDiscussion(
    ctx: ActionCtx,
    target: AssistantTarget,
    promptMessageId: string,
    runId: Id<'agentRuns'>
  ): Promise<string | null> {
    const access = await workspaceAccess(ctx, target.threadId, 'discussion', runId);
    return await continueAssistantWithConfiguration(
      ctx,
      target,
      await AssistantProvider.configured(ctx, {
        organizationId: access.organizationId,
        userId: access.credentialOwnerUserId
      }),
      { promptMessageId, runId, scope: 'discussion' }
    );
  }

  static async continueDiscussionWithModel(
    ctx: ActionCtx,
    target: AssistantTarget,
    options: {
      languageModel: AssistantLanguageModel;
      promptMessageId: string;
      runId: Id<'agentRuns'>;
    }
  ): Promise<string | null> {
    return await continueAssistantWithConfiguration(
      ctx,
      target,
      { languageModel: options.languageModel },
      { promptMessageId: options.promptMessageId, runId: options.runId, scope: 'discussion' }
    );
  }
}
