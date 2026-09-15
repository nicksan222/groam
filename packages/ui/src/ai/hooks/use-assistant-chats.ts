import type {
  AssistantContextTag,
  AssistantContextTagKind
} from '@groam/ai-contracts/agents/registry';
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { errorMessage } from '@groam/ui/lib/errors';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useState } from 'react';
import { serializeAgentScreenContext } from '#src/ai/context/agent-screen-context';
import type { AgentScreenContext } from '#tsx/ai/context/agent-context';

export type AssistantContextTagReference = {
  id: string;
  kind: AssistantContextTagKind;
};

function mutationTagReference(reference: AssistantContextTagReference) {
  if (reference.kind === 'trip') {
    return { id: reference.id as Id<'trips'>, kind: 'trip' as const };
  }
  if (reference.kind === 'destination') {
    return { id: reference.id as Id<'tripDestinations'>, kind: 'destination' as const };
  }
  return {
    id: reference.id as Id<'tripDestinationActivities'>,
    kind: 'activity' as const
  };
}

export function useAssistantChats(enabled = true) {
  const chatResults = useQuery(api.routes.assistant.chats.list.run, enabled ? {} : 'skip');
  const catalogResults = useQuery(api.routes.assistant.context.catalog.run, enabled ? {} : 'skip');
  const chats = chatResults ?? [];
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
  return checked
    ? [...current, reference].filter(
        (tag, index, all) =>
          all.findIndex((candidate) => candidate.id === tag.id && candidate.kind === tag.kind) ===
          index
      )
    : current.filter((tag) => tag.id !== reference.id || tag.kind !== reference.kind);
}

function contextTagReferences(
  tags: readonly AssistantContextTag[]
): AssistantContextTagReference[] {
  return tags.map(({ id, kind }) => ({ id, kind }));
}
