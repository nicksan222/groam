import { useUIMessages } from '@convex-dev/agent/react';
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useCurrentAgentContext } from '@groam/ui/ai/context/agent-context';
import { serializeAgentScreenContext } from '@groam/ui/ai/context/agent-screen-context';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createStore, useStore } from 'zustand';
import { MAX_MEDIA_PER_MESSAGE } from '@/features/discussions/discussion-thread/discussion-message-body';
import {
  createPendingPreviewUrl,
  isPreviewableMedia
} from '@/features/discussions/discussion-thread/discussion-pending-attachments';
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import { errorMessage } from '@/lib/errors';
import type {
  DiscussionMessage,
  DiscussionMessageMedia,
  DiscussionSendInput
} from '@/types/discussions';
import {
  createDiscussionSendStore,
  type DiscussionPendingUserMessage
} from './discussion-send-store';

export type { DiscussionMessage, DiscussionSendInput };

export function useDiscussionThread(
  discussionId: Id<'discussions'>,
  threadId: string | null | undefined
) {
  const {
    loadMore,
    results: messages,
    status
  } = useUIMessages(
    api.routes.discussions.messages.list.run,
    threadId ? { discussionId, threadId } : 'skip',
    { initialNumItems: 30, stream: true }
  );
  const attachmentsByMessageId = useQuery(api.routes.discussions.messages.attachments.run, {
    discussionId
  });
  const streamingMessage = [...messages]
    .reverse()
    .find((message) => message.status === 'streaming');
  const sending = useDiscussionSend({
    discussionId,
    hasStreamingResponse: streamingMessage !== undefined,
    messages: messages as DiscussionMessage[],
    threadId: threadId ?? null
  });
  const stopping = useDiscussionStop({
    discussionId,
    streamingMessage,
    threadId: threadId ?? null
  });
  const mergedMessages = useMemo(
    () =>
      mergeMessageAttachments(messages as DiscussionMessage[], attachmentsByMessageId ?? undefined),
    [attachmentsByMessageId, messages]
  );
  const displayMessages = withPendingUserMessage(
    mergedMessages,
    sending.pendingUserMessage,
    threadId ?? null
  );

  useEffect(() => {
    const pending = sending.pendingUserMessage;
    if (!pending) return;
    const replaced = mergedMessages.some((message) => !pending.baselineKeys.has(message.key));
    if (!replaced) return;
    for (const item of pending.media) {
      if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    }
    sending.clearPendingUserMessage();
  }, [mergedMessages, sending.clearPendingUserMessage, sending.pendingUserMessage]);

  return {
    canStop: streamingMessage !== undefined,
    isResponding: sending.isSending || streamingMessage !== undefined,
    isSending: sending.isSending,
    isStopping: stopping.isStopping,
    loadMore,
    messages: displayMessages,
    send: sending.send,
    status,
    stop: stopping.stop
  };
}

function useDiscussionSend({
  discussionId,
  hasStreamingResponse,
  messages,
  threadId
}: {
  discussionId: Id<'discussions'>;
  hasStreamingResponse: boolean;
  messages: DiscussionMessage[];
  threadId: string | null;
}) {
  const sendMutation = useMutation(api.routes.discussions.messages.send.run);
  const respondAction = useAction(api.routes.discussions.messages.respond.run);
  const uploadMedia = useMediaUpload();
  const context = useCurrentAgentContext();
  const [store] = useState(() => createDiscussionSendStore());
  const isSending = useStore(store, (state) => state.isSending);
  const pendingUserMessage = useStore(store, (state) => state.pendingUserMessage);

  const send = useCallback(
    async ({ files = [], text }: DiscussionSendInput) => {
      const normalizedPrompt = text.trim();
      const sendState = store.getState();
      if (
        !threadId ||
        (!normalizedPrompt && files.length === 0) ||
        sendState.isSending ||
        hasStreamingResponse
      ) {
        return false;
      }
      if (files.length > MAX_MEDIA_PER_MESSAGE) {
        toast.error(`You can attach up to ${MAX_MEDIA_PER_MESSAGE} files`);
        return false;
      }

      const previewMedia: DiscussionMessageMedia[] = files.map((file) => ({
        contentType: file.type || 'application/octet-stream',
        name: file.name,
        size: file.size,
        url: isPreviewableMedia(file.type) ? createPendingPreviewUrl(file) : null
      }));

      store.getState().setPending({
        baselineKeys: new Set(messages.map((message) => message.key)),
        createdAt: Date.now(),
        key: store.getState().nextOptimisticKey(),
        media: previewMedia.map((item) => ({
          contentType: item.contentType,
          name: item.name,
          size: item.size ?? 0,
          url: item.url
        })),
        prompt: normalizedPrompt,
        threadId
      });
      store.getState().setSending(true);
      try {
        const mediaIds: Id<'media'>[] = [];
        for (const file of files) {
          const mediaId = await uploadMedia(file, null);
          if (!mediaId) {
            for (const item of previewMedia) {
              if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
            }
            store.getState().clearPending();
            return false;
          }
          mediaIds.push(mediaId);
        }
        const result = await sendMutation({
          clientRequestId: crypto.randomUUID(),
          discussionId,
          ...(mediaIds.length > 0 ? { mediaIds } : {}),
          text: normalizedPrompt
        });
        if (result.assistantAgent && context) {
          void respondAction({
            discussionId,
            promptMessageId: result.messageId,
            screen: serializeAgentScreenContext(context)
          }).catch((error: unknown) => {
            toast.error(errorMessage(error, 'Unable to get Groam’s reply'));
          });
        }
        return true;
      } catch (error: unknown) {
        store.getState().clearPending();
        for (const item of previewMedia) {
          if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
        }
        toast.error(errorMessage(error, 'Unable to send your message'));
        return false;
      } finally {
        store.getState().setSending(false);
      }
    },
    [
      context,
      discussionId,
      hasStreamingResponse,
      messages,
      respondAction,
      sendMutation,
      store,
      threadId,
      uploadMedia
    ]
  );

  const clearPendingUserMessage = useCallback(() => store.getState().clearPending(), [store]);

  return {
    clearPendingUserMessage,
    isSending,
    pendingUserMessage,
    send
  };
}

function useDiscussionStop({
  discussionId,
  streamingMessage,
  threadId
}: {
  discussionId: Id<'discussions'>;
  streamingMessage: DiscussionMessage | undefined;
  threadId: string | null;
}) {
  const stopMutation = useMutation(api.routes.discussions.messages.stop.run);
  const [store] = useState(() =>
    createStore<{ isStopping: boolean; setStopping: (value: boolean) => void }>()((set) => ({
      isStopping: false,
      setStopping: (isStopping) => set({ isStopping })
    }))
  );
  const isStopping = useStore(store, (state) => state.isStopping);

  const stop = useCallback(async () => {
    if (!threadId || !streamingMessage || store.getState().isStopping) return false;
    store.getState().setStopping(true);
    try {
      await stopMutation({
        discussionId,
        order: streamingMessage.order,
        threadId
      });
      return true;
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to stop Groam'));
      return false;
    } finally {
      store.getState().setStopping(false);
    }
  }, [discussionId, stopMutation, store, streamingMessage, threadId]);

  return { isStopping, stop };
}

function withPendingUserMessage(
  messages: DiscussionMessage[],
  pending: DiscussionPendingUserMessage | null,
  threadId: string | null
): DiscussionMessage[] {
  if (!pending || !threadId || pending.threadId !== threadId) return messages;
  if (messages.some((message) => !pending.baselineKeys.has(message.key))) {
    return messages;
  }
  return [
    ...messages,
    {
      _creationTime: pending.createdAt,
      attachments: pending.media,
      author: { name: 'You', userId: 'pending' },
      id: pending.key,
      key: pending.key,
      media: pending.media,
      mine: true,
      order: Number.MAX_SAFE_INTEGER,
      parts: [{ text: pending.prompt, type: 'text' }],
      role: 'user',
      status: 'pending',
      stepOrder: 0,
      text: pending.prompt
    } satisfies DiscussionMessage
  ];
}

function mergeMessageAttachments(
  messages: DiscussionMessage[],
  attachmentsByMessageId: Record<string, DiscussionMessageMedia[]> | undefined
): DiscussionMessage[] {
  if (!attachmentsByMessageId) return messages;
  return messages.map((message) => {
    const fromQuery = attachmentsByMessageId[message.id];
    const attachments =
      fromQuery && fromQuery.length > 0 ? fromQuery : (message.attachments ?? message.media ?? []);
    return {
      ...message,
      attachments,
      media: attachments
    };
  });
}
