import { api } from '@groam/backend/api';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { ChatGptConnectionId, ChatGptModel } from '@/types/ai-settings';

async function openAuthorization(
  authorization: Promise<{ authorizationUrl: string }>,
  popup: Window | null
): Promise<null> {
  try {
    const { authorizationUrl } = await authorization;
    if (popup) popup.location.href = authorizationUrl;
    else window.location.assign(authorizationUrl);
    return null;
  } catch (cause) {
    popup?.close();
    throw cause;
  }
}

export function useAiSettings() {
  const remote = useQuery(api.routes.settings.ai.get.run, {});
  const connectAction = useAction(api.routes.settings.ai.connect.run);
  const disconnectAction = useAction(api.routes.settings.ai.disconnect.run);
  const modelsAction = useAction(api.routes.settings.ai.models.run);
  const selectMutation = useMutation(api.routes.settings.ai.select.run);
  const acknowledgeMutation = useMutation(api.routes.settings.ai.acknowledge.run);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setPending] = useState(false);
  const [models, setModels] = useState<ChatGptModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const connection = remote?.connections.find((item) => item.id === remote.activeConnectionId);
  const connectionId = connection?.connected && !connection.needsReconnect ? connection.id : null;

  useEffect(() => {
    let cancelled = false;
    setModels([]);
    setModelsLoading(false);
    if (!connectionId) return;
    setModelsLoading(true);
    void modelsAction({ connectionId })
      .then((catalog) => {
        if (!cancelled) setModels(catalog);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorMessage(cause, 'Unable to load ChatGPT models'));
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId, modelsAction]);

  const perform = async (operation: Promise<string | null>, success?: string) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await operation;
      const successMessage = success ?? result;
      if (successMessage) setMessage(successMessage);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to update your ChatGPT connection'));
    } finally {
      setPending(false);
    }
  };

  return {
    remote,
    connection,
    models,
    modelsLoading,
    error,
    message,
    isPending,
    isLoading: remote === undefined,
    connect: (id?: ChatGptConnectionId) => {
      // Open synchronously so browser popup protection does not discard the OAuth window.
      const popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
      return perform(openAuthorization(connectAction(id ? { connectionId: id } : {}), popup));
    },
    disconnect: (id: ChatGptConnectionId) =>
      perform(
        disconnectAction({ connectionId: id }).then((result) =>
          result.revoked
            ? 'ChatGPT disconnected.'
            : 'ChatGPT disconnected from Groam. Manage any remaining authorization in ChatGPT settings.'
        )
      ),
    selectConnection: (id: ChatGptConnectionId) => perform(selectMutation({ connectionId: id })),
    selectModel: (model: string) =>
      connectionId
        ? perform(selectMutation({ connectionId, model }), 'ChatGPT model saved.')
        : Promise.resolve(),
    acknowledge: () => perform(acknowledgeMutation({}))
  };
}
