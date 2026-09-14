import { Agent, updateThreadMetadata } from '@convex-dev/agent';
import {
  type AssistantAgentId,
  assistantThreadSummary,
  isDefaultAssistantChatTitle,
  parseAssistantThreadSummary
} from '@groam/ai-contracts/agents/registry';
import {
  type AssistantScreen,
  assistantConversationContextKey
} from '@groam/ai-contracts/agents/screen';
import { chatAgentCallSettings } from '@groam/ai-contracts/provider';
import { stepCountIs } from 'ai';
import { ConvexError } from 'convex/values';
import { createRegisteredAssistantTools } from '#backend/assistant/tools/index';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { AssistantChats } from '#convex/modules/assistant/chat/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { AssistantScreens } from '#convex/modules/assistant/screen/index';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { type ActionCtx, env } from '#convex-generated/server';
import { AssistantInstructions } from './instructions';
import {
  type AssistantConfiguration,
  type AssistantConversationScope,
  type AssistantLanguageModel,
  type AssistantTarget,
  AssistantTargets
} from './types';

const MAX_PROMPT_LENGTH = 5_000;

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

function createAssistant(
  agentId: AssistantAgentId,
  screen: AssistantTarget['screen'],
  tripId: Id<'trips'> | null,
  threadId: string,
  configuration: AssistantConfiguration,
  prompt: string,
  scope: AssistantConversationScope
) {
  const registered = createRegisteredAssistantTools({
    activeTripId: tripId,
    agentId,
    prompt,
    screen,
    scope,
    threadId,
    ...(configuration.providerTools ? { providerTools: configuration.providerTools } : {})
  });
  return new Agent(components.agent, {
    callSettings: chatAgentCallSettings(env.OPENAI_BASE_URL),
    contextOptions: { excludeToolMessages: false, recentMessages: 100 },
    instructions: AssistantInstructions.for(agentId, scope, registered.guidance),
    languageModel: configuration.languageModel,
    name: agentId,
    stopWhen: stepCountIs(8),
    tools: registered.tools
  });
}

async function workspaceAccess(
  ctx: ActionCtx,
  threadId?: string,
  scope: Exclude<AssistantConversationScope, 'standalone'> = 'private'
) {
  return await ctx.runQuery(internal.modules.assistant.model.index.access, {
    scope,
    ...(threadId ? { threadId } : {})
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
  const access = await workspaceAccess(ctx, target.threadId, options.scope);
  const activeTripId = AssistantTargets.activeTripId(access.tags, target.screen);
  const assistant = createAssistant(
    target.agent,
    target.screen,
    activeTripId,
    target.threadId,
    configuration,
    prompt,
    options.scope
  );
  let promptMessageId = options.promptMessageId;
  if (!promptMessageId) {
    await purgeLegacySystemMessages(ctx, assistant, target.threadId);
    const { messages } = await assistant.saveMessages(ctx, {
      messages: [{ content: prompt, role: 'user' }],
      skipEmbeddings: true,
      threadId: target.threadId,
      userId: access.userId
    });
    promptMessageId = messages[messages.length - 1]?._id;
    if (!promptMessageId) throw new ConvexError('Unable to save the assistant message');
    const generatedTitle = isDefaultAssistantChatTitle(access.threadTitle)
      ? prompt
          .replace(/^\s*@[a-z][a-z-]*\s*/iu, '')
          .slice(0, 80)
          .trim()
      : '';
    await updateThreadMetadata(ctx, components.agent, {
      patch: {
        summary: assistantThreadSummary(
          access.organizationId,
          access.tags,
          Date.now(),
          JSON.stringify(target.screen)
        ),
        ...(generatedTitle ? { title: generatedTitle } : {})
      },
      threadId: target.threadId
    });
  }
  const { thread } = await assistant.continueThread(ctx, {
    threadId: target.threadId,
    userId: access.userId
  });
  const runId = options.runId;
  if (runId) {
    await AgentRunTracking.record(ctx, runId, 'status', 'Responding', prompt.slice(0, 160));
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
    const responseText = await result.text;
    if (runId) {
      const report = responseText.trim() || 'Finished this discussion turn.';
      await AgentRunTracking.record(ctx, runId, 'report', 'Report ready', report.slice(0, 500));
    }
    return responseText;
  } catch (error: unknown) {
    if (isAbortError(error)) return null;
    throw AssistantErrors.from(streamFailure ?? error);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function purgeLegacySystemMessages(
  ctx: ActionCtx,
  assistant: ReturnType<typeof createAssistant>,
  threadId: string
): Promise<void> {
  const messages = await assistant.listMessages(ctx, {
    paginationOpts: { cursor: null, numItems: 100 },
    threadId
  });
  const systemMessages = [];
  for (const message of messages.page) {
    if (message.message?.role === 'system') systemMessages.push(message);
  }
  await Promise.all(
    systemMessages.map(
      async (message) => await assistant.deleteMessage(ctx, { messageId: message._id })
    )
  );
}

/** Action-side private and discussion assistant turns. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
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
      await AssistantProvider.configured(ctx, target.agent, access.organizationId),
      { scope: 'private' }
    );
    return null;
  }

  static async resend(
    ctx: ActionCtx,
    target: AssistantTarget & { messageId: string; order: number; stepOrder: number }
  ): Promise<null> {
    const access = await workspaceAccess(ctx, target.threadId);
    const configuration = await AssistantProvider.configured(
      ctx,
      target.agent,
      access.organizationId
    );
    const activeTripId = AssistantTargets.activeTripId(access.tags, target.screen);
    const assistant = createAssistant(
      target.agent,
      target.screen,
      activeTripId,
      target.threadId,
      configuration,
      target.prompt,
      'private'
    );
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
    await purgeLegacySystemMessages(ctx, assistant, target.threadId);
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

  static async continueDiscussion(
    ctx: ActionCtx,
    target: AssistantTarget,
    promptMessageId: string,
    runId: Id<'agentRuns'>
  ): Promise<string | null> {
    const access = await workspaceAccess(ctx, target.threadId, 'discussion');
    return await continueAssistantWithConfiguration(
      ctx,
      target,
      await AssistantProvider.configured(ctx, target.agent, access.organizationId),
      { promptMessageId, runId, scope: 'discussion' }
    );
  }

  static async continueDiscussionWithModel(
    ctx: ActionCtx,
    target: AssistantTarget,
    promptMessageId: string,
    languageModel: AssistantLanguageModel,
    runId: Id<'agentRuns'>
  ): Promise<string | null> {
    return await continueAssistantWithConfiguration(
      ctx,
      target,
      { languageModel },
      { promptMessageId, runId, scope: 'discussion' }
    );
  }
}
