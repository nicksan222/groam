import { toast } from '@groam/ui/components/toast';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useState } from 'react';
import type { AssistantContextTag, AssistantContextTagKind } from '#ai/agents';
import type { AgentScreenContext } from '#ai/ui/context/agent-context';
import { serializeAgentScreenContext } from '#ai/ui/context/agent-screen-context';
import type { AssistantBackendApi } from '#ai/ui/hooks/assistant-functions';

export type AssistantContextTagReference = {
  id: string;
  kind: AssistantContextTagKind;
};

/**
 * Chat row shape the assistant UI reads, mirrored from the backend chat list
 * view (`routes/assistant/chats/list.ts`). Keep the fields in sync — the chat
 * menu, attachments, and context filters read exactly these.
 */
export type AssistantChatSummary = {
  /** The conversation the chat belongs to (`assistantConversationContextKey`), if known. */
  contextKey: string | null;
  id: string;
  status: 'active' | 'archived';
  tags: AssistantContextTag[];
  title: string;
};

function mutationTagReference(reference: AssistantContextTagReference) {
  // Backend document ids are branded strings; this package carries plain
  // strings so it never imports the backend's generated id types.
  if (reference.kind === 'trip') {
    return { id: reference.id, kind: 'trip' as const };
  }
  if (reference.kind === 'destination') {
    return { id: reference.id, kind: 'destination' as const };
  }
  return { id: reference.id, kind: 'activity' as const };
}

/** The viewer's private chats, newest first, and the workspace entities a chat can attach. */
export function useAssistantChats(api: AssistantBackendApi) {
  const chatResults = useQuery(api.routes.assistant.chats.list.run, {});
  const catalogResults = useQuery(api.routes.assistant.context.catalog.run, {});
  const chats: AssistantChatSummary[] = chatResults ?? [];
  const catalog = catalogResults ?? [];
  const createAction = useAction(api.routes.assistant.chats.create.run);
  const setTagsMutation = useMutation(api.routes.assistant.chats.tags.run);
  const { isPending: isCreating, run: runCreate } = useAsyncAction({
    fallbackError: 'Unable to create an AI chat',
    onError: (message) => toast.error(message)
  });

  const createChat = useCallback(
    async (context: AgentScreenContext) => {
      const created = await runCreate(
        async () => (await createAction({ screen: serializeAgentScreenContext(context) })) as string
      );
      return created.status === 'ok' ? created.value : null;
    },
    [createAction, runCreate]
  );

  const tagging = useAsyncAction({
    fallbackError: 'Unable to update AI chat context',
    onError: (message) => toast.error(message)
  });
  const runTagging = tagging.run;
  const [taggedThreadId, setTaggedThreadId] = useState<string | null>(null);
  const setTags = useCallback(
    async (threadId: string, tags: AssistantContextTagReference[]) => {
      setTaggedThreadId(threadId);
      const outcome = await runTagging(() =>
        setTagsMutation({ tags: tags.map(mutationTagReference), threadId })
      );
      return outcome.status === 'ok';
    },
    [runTagging, setTagsMutation]
  );

  return {
    catalog,
    chats,
    createChat,
    isCreating,
    isLoading: chatResults === undefined,
    setTags,
    updatingThreadId: tagging.isPending ? taggedThreadId : null
  };
}

export function toggleContextTagReferences(
  tags: readonly AssistantContextTag[],
  reference: AssistantContextTagReference,
  checked: boolean
): AssistantContextTagReference[] {
  const current = contextTagReferences(tags);
  if (!checked) {
    return current.filter((tag) => tag.id !== reference.id || tag.kind !== reference.kind);
  }
  const exists = current.some((tag) => tag.id === reference.id && tag.kind === reference.kind);
  return exists ? current : [...current, reference];
}

function contextTagReferences(
  tags: readonly AssistantContextTag[]
): AssistantContextTagReference[] {
  return tags.map(({ id, kind }) => ({ id, kind }));
}
