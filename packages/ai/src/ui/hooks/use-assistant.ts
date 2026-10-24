import { type UIMessage, useUIMessages } from '@convex-dev/agent/react';
import { toast } from '@groam/ui/components/toast';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useAction, useMutation } from 'convex/react';
import { type RefObject, useCallback, useRef, useState } from 'react';
import { assistantAgents } from '#ai/agents';
import { assistantConversationContextKey } from '#ai/runtime/screen';
import type { AgentScreenContext } from '#ai/ui/context/agent-context';
import { serializeAgentScreenContext } from '#ai/ui/context/agent-screen-context';
import type { AssistantBackendApi } from '#ai/ui/hooks/assistant-functions';
import type { AssistantChatSummary } from '#ai/ui/hooks/use-assistant-chats';

type PendingUserMessage = {
  baselineKeys: Set<string>;
  createdAt: number;
  key: string;
  prompt: string;
  /** Null while the first message of a page is still starting its thread. */
  threadId: string | null;
};

/**
 * The private assistant conversation for the current page. Reading it never writes: the page's
 * conversation is its newest active chat in `chats` (the viewer's chats, newest first, or
 * `undefined` while they load), and its messages subscribe as soon as the page registers its
 * context. A thread is only started by the first message sent on a page that has none.
 */
export function useAssistant(
  context: AgentScreenContext | null,
  api: AssistantBackendApi,
  chats: readonly AssistantChatSummary[] | undefined
) {
  const thread = useAssistantThread(context, api, chats);
  const {
    loadMore,
    results: messages,
    status
  } = useUIMessages(
    api.routes.assistant.messages.run,
    thread.threadId ? { threadId: thread.threadId } : 'skip',
    { initialNumItems: 30, stream: true }
  );
  const streamingMessage = [...messages]
    .reverse()
    .find((message) => message.status === 'streaming');
  // The order of a response the viewer stopped: its send then ends with an abort, not a failure.
  const stoppedOrder = useRef<number | null>(null);
  const sending = useAssistantSend({
    api,
    context,
    ensureThread: thread.ensureThread,
    hasStreamingResponse: streamingMessage !== undefined,
    messages,
    stoppedOrder,
    threadId: thread.threadId
  });
  const stopping = useAssistantStop({
    api,
    stoppedOrder,
    streamingMessage,
    threadId: thread.threadId
  });
  const resend = useAssistantResend({ api, context, threadId: thread.threadId });

  return {
    canStop: streamingMessage !== undefined,
    isLoading: thread.isLoading,
    isResponding: sending.isSending || streamingMessage !== undefined,
    isSending: sending.isSending,
    isStopping: stopping.isStopping,
    loadMore,
    messages: withPendingUserMessage(messages, sending.pendingUserMessage, thread.threadId),
    resend: resend.resend,
    selectThread: thread.selectThread,
    send: sending.send,
    status,
    stop: stopping.stop,
    threadId: thread.threadId
  };
}

function useAssistantThread(
  context: AgentScreenContext | null,
  api: AssistantBackendApi,
  chats: readonly AssistantChatSummary[] | undefined
) {
  const openAction = useAction(api.routes.assistant.open.run);
  // Threads picked in the chat menu or started here, per conversation; they win over the list.
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const contextKey = context ? assistantConversationContextKey(context) : null;
  // The same choice the backend's `open` makes: the newest active chat of this conversation.
  const existing =
    contextKey === null
      ? undefined
      : chats?.find((chat) => chat.status === 'active' && chat.contextKey === contextKey)?.id;
  const pinned = contextKey === null ? undefined : chosen[contextKey];
  // Once shown, a conversation stays on its thread: a newer chat elsewhere does not swap it.
  if (contextKey !== null && pinned === undefined && existing !== undefined) {
    setChosen((current) => ({ ...current, [contextKey]: existing }));
  }
  const threadId = pinned ?? existing ?? null;

  const selectThread = useCallback(
    (selectedThreadId: string) => {
      if (contextKey) setChosen((current) => ({ ...current, [contextKey]: selectedThreadId }));
    },
    [contextKey]
  );

  /** The conversation's thread, started on first use; throws when it cannot be started. */
  const ensureThread = useCallback(
    async (screen: AgentScreenContext): Promise<string> => {
      if (threadId) return threadId;
      const startedFor = assistantConversationContextKey(screen);
      // `open` reuses a thread the chat list has not caught up with yet before creating one.
      const started = await openAction({ screen: serializeAgentScreenContext(screen) });
      setChosen((current) => ({ ...current, [startedFor]: started }));
      return started;
    },
    [openAction, threadId]
  );

  return {
    ensureThread,
    isLoading: context !== null && chats === undefined,
    selectThread,
    threadId
  };
}

function useAssistantSend({
  api,
  context,
  ensureThread,
  hasStreamingResponse,
  messages,
  stoppedOrder,
  threadId
}: {
  api: AssistantBackendApi;
  context: AgentScreenContext | null;
  ensureThread: (screen: AgentScreenContext) => Promise<string>;
  hasStreamingResponse: boolean;
  messages: UIMessage[];
  stoppedOrder: RefObject<number | null>;
  threadId: string | null;
}) {
  const sendAction = useAction(api.routes.assistant.send.run);
  const sending = useAsyncAction({
    fallbackError: 'Unable to send your message',
    onError: (message) => toast.error(message)
  });
  const [pendingUserMessage, setPendingUserMessage] = useState<PendingUserMessage | null>(null);
  const optimisticMessageSequence = useRef(0);

  const send = async (prompt: string) => {
    const normalizedPrompt = prompt.trim();
    if (!context || !normalizedPrompt || hasStreamingResponse) return false;
    // `run` never calls this for a second submit while one is in flight, so the first message's
    // optimistic copy stays.
    const sent = await sending.run(async () => {
      stoppedOrder.current = null;
      optimisticMessageSequence.current += 1;
      const key = `optimistic-user-${optimisticMessageSequence.current}`;
      setPendingUserMessage({
        baselineKeys: new Set(messages.map((message) => message.key)),
        createdAt: Date.now(),
        key,
        prompt: normalizedPrompt,
        threadId
      });
      try {
        const sendTo = await ensureThread(context);
        setPendingUserMessage((pending) =>
          pending?.key === key ? { ...pending, threadId: sendTo } : pending
        );
        await sendAction({
          agent: assistantAgents.groam.id,
          prompt: normalizedPrompt,
          screen: serializeAgentScreenContext(context),
          threadId: sendTo
        });
      } catch (error: unknown) {
        if (stoppedOrder.current === null) throw error;
      } finally {
        stoppedOrder.current = null;
      }
    });
    if (sent.status === 'ok') return true;
    if (sent.status === 'error') setPendingUserMessage(null);
    return false;
  };
  return { isSending: sending.isPending, pendingUserMessage, send };
}

function useAssistantResend({
  api,
  context,
  threadId
}: {
  api: AssistantBackendApi;
  context: AgentScreenContext | null;
  threadId: string | null;
}) {
  const resendAction = useAction(api.routes.assistant.resend.run);
  const resending = useAsyncAction({
    fallbackError: 'Unable to resend this message',
    onError: (message) => toast.error(message)
  });
  const resend = async (message: UIMessage) => {
    const prompt = message.text.trim();
    if (!context || !threadId || !prompt) return false;
    const resent = await resending.run(() =>
      resendAction({
        agent: assistantAgents.groam.id,
        messageId: message.id,
        order: message.order,
        prompt,
        screen: serializeAgentScreenContext(context),
        stepOrder: message.stepOrder,
        threadId
      })
    );
    return resent.status === 'ok';
  };
  return { resend };
}

function useAssistantStop({
  api,
  stoppedOrder,
  streamingMessage,
  threadId
}: {
  api: AssistantBackendApi;
  stoppedOrder: RefObject<number | null>;
  streamingMessage: UIMessage | undefined;
  threadId: string | null;
}) {
  const stopMutation = useMutation(api.routes.assistant.stop.run);
  const stopping = useAsyncAction({
    fallbackError: 'Unable to stop Groam',
    onError: (message) => toast.error(message)
  });
  const stop = async () => {
    if (!threadId || !streamingMessage) return false;
    const order = streamingMessage.order;
    const outcome = await stopping.run(async () => {
      stoppedOrder.current = order;
      const stopped = (await stopMutation({ order, threadId })) as boolean;
      if (!stopped) stoppedOrder.current = null;
      return stopped;
    });
    if (outcome.status === 'error') stoppedOrder.current = null;
    return outcome.status === 'ok' && outcome.value;
  };
  return { isStopping: stopping.isPending, stop };
}

function withPendingUserMessage(
  messages: UIMessage[],
  pending: PendingUserMessage | null,
  threadId: string | null
): UIMessage[] {
  if (!pending || (pending.threadId !== null && pending.threadId !== threadId)) return messages;
  const persisted = messages.some(
    (message) =>
      message.role === 'user' &&
      message.text === pending.prompt &&
      !pending.baselineKeys.has(message.key)
  );
  if (persisted) return messages;

  const optimisticMessage: UIMessage = {
    _creationTime: pending.createdAt,
    id: pending.key,
    key: pending.key,
    order: Number.MAX_SAFE_INTEGER,
    parts: [{ text: pending.prompt, type: 'text' }],
    role: 'user',
    status: 'pending',
    stepOrder: 0,
    text: pending.prompt
  };
  const firstNewAssistantIndex = messages.findIndex(
    (message) => message.role === 'assistant' && !pending.baselineKeys.has(message.key)
  );
  if (firstNewAssistantIndex === -1) return [...messages, optimisticMessage];
  return [
    ...messages.slice(0, firstNewAssistantIndex),
    optimisticMessage,
    ...messages.slice(firstNewAssistantIndex)
  ];
}
