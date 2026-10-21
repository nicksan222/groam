import { toast } from '@groam/ui/components/toast';
import { errorMessage } from '@groam/ui/lib/errors';
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
  contextKey: string;
  id: string;
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

export function useAssistantChats(api: AssistantBackendApi, enabled = true) {
  const chatResults = useQuery(api.routes.assistant.chats.list.run, enabled ? {} : 'skip');
  const catalogResults = useQuery(api.routes.assistant.context.catalog.run, enabled ? {} : 'skip');
  const chats: AssistantChatSummary[] = chatResults ?? [];
  const catalog = catalogResults ?? [];
  const createAction = useAction(api.routes.assistant.chats.create.run);
  const setTagsMutation = useMutation(api.routes.assistant.chats.tags.run);
  const [isCreating, setCreating] = useState(false);
  const [updatingThreadId, setUpdatingThreadId] = useState<string | null>(null);

  const createChat = useCallback(
    async (context: AgentScreenContext) => {
      if (isCreating) return null;
      setCreating(true);
      try {
        return await createAction({ screen: serializeAgentScreenContext(context) });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to create an AI chat'));
        return null;
      } finally {
        setCreating(false);
      }
    },
    [createAction, isCreating]
  );

  const setTags = useCallback(
    async (threadId: string, tags: AssistantContextTagReference[]) => {
      setUpdatingThreadId(threadId);
      try {
        await setTagsMutation({ tags: tags.map(mutationTagReference), threadId });
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to update AI chat context'));
        return false;
      } finally {
        setUpdatingThreadId(null);
      }
    },
    [setTagsMutation]
  );

  return {
    catalog,
    chats,
    createChat,
    isCreating,
    isLoading: enabled && chatResults === undefined,
    setTags,
    updatingThreadId
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
