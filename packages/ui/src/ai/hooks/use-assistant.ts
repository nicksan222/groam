import { type UIMessage, useUIMessages } from '@convex-dev/agent/react';
import { assistantAgents } from '@groam/ai-contracts/agents/registry';
import { assistantConversationContextKey } from '@groam/ai-contracts/agents/screen';
import { api } from '@groam/backend/api';
import { toast } from '@groam/ui/components/toast';
import { errorMessage } from '@groam/ui/lib/errors';
import { useAction, useMutation } from 'convex/react';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { serializeAgentScreenContext } from '#src/ai/context/agent-screen-context';
import type { AgentScreenContext } from '#tsx/ai/context/agent-context';

type PendingUserMessage = {
  baselineKeys: Set<string>;
  createdAt: number;
  key: string;
  prompt: string;
  threadId: string;
};

export type UseAssistantOptions = { enabled?: boolean; threadId?: string | null };

export function useAssistant(
  context: AgentScreenContext | null,
  options: UseAssistantOptions = {}
) {
  const enabled = options.enabled ?? true;
  const thread = useAssistantThread(context, enabled, options.threadId);
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
  const stopRequested = useRef(false);
  const sending = useAssistantSend({
    context,
    enabled,
    hasStreamingResponse: streamingMessage !== undefined,
    messages,
    stopRequested,
    threadId: thread.threadId
  });
  const stopping = useAssistantStop({
    stopRequested,
    streamingMessage,
    threadId: thread.threadId
  });
  const resend = useAssistantResend({ context, enabled, threadId: thread.threadId });
  useAssistantScreenContext(context, thread.threadId);

  return {
    canStop: streamingMessage !== undefined,
    isOpening: thread.isOpening,
    isResponding: sending.isSending || streamingMessage !== undefined,
    isSending: sending.isSending,
    isStopping: stopping.isStopping,
    loadMore,
    messages: withPendingUserMessage(messages, sending.pendingUserMessage, thread.threadId),
    open: thread.open,
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
  enabled: boolean,
  requestedThreadId: string | null | undefined
) {
  const openAction = useAction(api.routes.assistant.open.run);
  const [openedThreads, setOpenedThreads] = useState<Record<string, string>>({});
  const [isOpening, setOpening] = useState(false);
  const isControlled = requestedThreadId !== undefined;
  const contextKey = context ? assistantConversationContextKey(context) : null;
  const threadId = isControlled
    ? (requestedThreadId ?? null)
    : contextKey
      ? (openedThreads[contextKey] ?? null)
      : null;

  // Keep the durable thread and its Convex subscription alive while the panel is closed.
  // This lets Convex retain the last messages and reactively reconcile them before reopen.

  const open = useCallback(async () => {
    if (!enabled || isControlled || !context || threadId || isOpening) return;
    setOpening(true);
    try {
      const openingFor = contextKey;
      const selected = await openAction({ screen: serializeAgentScreenContext(context) });
      if (openingFor) {
        setOpenedThreads((current) => ({ ...current, [openingFor]: selected }));
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to start Groam AI'));
    } finally {
      setOpening(false);
    }
  }, [context, contextKey, enabled, isControlled, isOpening, openAction, threadId]);

  const selectThread = useCallback(
    (selectedThreadId: string) => {
      if (!(isControlled || !contextKey)) {
        setOpenedThreads((current) => ({ ...current, [contextKey]: selectedThreadId }));
      }
    },
    [contextKey, isControlled]
  );
  return { isOpening, open, selectThread, threadId };
}

function useAssistantSend({
  context,
  enabled,
  hasStreamingResponse,
  messages,
  stopRequested,
  threadId
}: {
  context: AgentScreenContext | null;
  enabled: boolean;
  hasStreamingResponse: boolean;
  messages: UIMessage[];
  stopRequested: RefObject<boolean>;
  threadId: string | null;
}) {
  const sendAction = useAction(api.routes.assistant.send.run);
  const [isSending, setSending] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<PendingUserMessage | null>(null);
  const optimisticMessageSequence = useRef(0);

  const send = useCallback(
    async (prompt: string) => {
      const normalizedPrompt = prompt.trim();
      if (
        !enabled ||
        !context ||
        !threadId ||
        !normalizedPrompt ||
        isSending ||
        hasStreamingResponse
      ) {
        return false;
      }
      stopRequested.current = false;
      optimisticMessageSequence.current += 1;
      setPendingUserMessage({
        baselineKeys: new Set(messages.map((message) => message.key)),
        createdAt: Date.now(),
        key: `optimistic-user-${optimisticMessageSequence.current}`,
        prompt: normalizedPrompt,
        threadId
      });
      setSending(true);
      try {
        await sendAction({
          agent: assistantAgents.groam.id,
          prompt: normalizedPrompt,
          screen: serializeAgentScreenContext(context),
          threadId
        });
        return true;
      } catch (error: unknown) {
        if (stopRequested.current) return true;
        setPendingUserMessage(null);
        toast.error(errorMessage(error, 'Unable to send your message'));
        return false;
      } finally {
        stopRequested.current = false;
        setSending(false);
      }
    },
    [
      context,
      enabled,
      hasStreamingResponse,
      isSending,
      messages,
      sendAction,
      stopRequested,
      threadId
    ]
  );
  return { isSending, pendingUserMessage: enabled ? pendingUserMessage : null, send };
}

function useAssistantScreenContext(
  context: AgentScreenContext | null,
  threadId: string | null
): void {
  const setScreenContext = useMutation(api.routes.assistant.context.screen.run);
  const synced = useRef<string | null>(null);
  const contextKey = JSON.stringify(context);

  useEffect(() => {
    if (!context || !threadId) {
      synced.current = null;
      return;
    }
    const key = `${threadId}:${contextKey}`;
    if (key === synced.current) return;
    const timeout = window.setTimeout(() => {
      void setScreenContext({
        screen: serializeAgentScreenContext(context),
        threadId
      })
        .then(() => {
          synced.current = key;
        })
        .catch((error: unknown) => {
          toast.error(errorMessage(error, 'Unable to update Groam AI context'));
        });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [context, contextKey, setScreenContext, threadId]);
}

function useAssistantResend({
  context,
  enabled,
  threadId
}: {
  context: AgentScreenContext | null;
  enabled: boolean;
  threadId: string | null;
}) {
  const resendAction = useAction(api.routes.assistant.resend.run);
  const [isResending, setResending] = useState(false);
  const resend = useCallback(
    async (message: UIMessage) => {
      const prompt = message.text.trim();
      if (!enabled || !context || !threadId || !prompt || isResending) return false;
      setResending(true);
      try {
        await resendAction({
          agent: assistantAgents.groam.id,
          messageId: message.id,
          order: message.order,
          prompt,
          screen: serializeAgentScreenContext(context),
          stepOrder: message.stepOrder,
          threadId
        });
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to resend this message'));
        return false;
      } finally {
        setResending(false);
      }
    },
    [context, enabled, isResending, resendAction, threadId]
  );
  return { resend };
}

function useAssistantStop({
  stopRequested,
  streamingMessage,
  threadId
}: {
  stopRequested: RefObject<boolean>;
  streamingMessage: UIMessage | undefined;
  threadId: string | null;
}) {
  const stopMutation = useMutation(api.routes.assistant.stop.run);
  const [isStopping, setStopping] = useState(false);
  const stop = useCallback(async () => {
    if (!threadId || !streamingMessage || isStopping) return false;
    stopRequested.current = true;
    setStopping(true);
    try {
      const stopped = await stopMutation({ order: streamingMessage.order, threadId });
      if (!stopped) stopRequested.current = false;
      return stopped;
    } catch (error: unknown) {
      stopRequested.current = false;
      toast.error(errorMessage(error, 'Unable to stop Groam'));
      return false;
    } finally {
      setStopping(false);
    }
  }, [isStopping, stopMutation, stopRequested, streamingMessage, threadId]);
  return { isStopping, stop };
}

function withPendingUserMessage(
  messages: UIMessage[],
  pending: PendingUserMessage | null,
  threadId: string | null
): UIMessage[] {
  if (!pending || pending.threadId !== threadId) return messages;
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
