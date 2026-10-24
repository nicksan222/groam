import { api } from '@groam/backend/api';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
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
  const { error, isPending, run, setError } = useAsyncAction({
    fallbackError: 'Unable to update your ChatGPT connection'
  });
  const [message, setMessage] = useState<string | null>(null);
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
  }, [connectionId, modelsAction, setError]);

  // Takes a thunk, so a call the guard ignores never starts its request.
  const perform = async (operation: () => Promise<string | null>, success?: string) => {
    setMessage(null);
    return run(async () => {
      const result = await operation();
      const successMessage = success ?? result;
      if (successMessage) setMessage(successMessage);
    });
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
    connect: async (id?: ChatGptConnectionId) => {
      // Open synchronously so browser popup protection does not discard the OAuth window.
      const popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
      const outcome = await perform(() =>
        openAuthorization(connectAction(id ? { connectionId: id } : {}), popup)
      );
      // Ignored: nothing ran, so nothing will navigate the blank window.
      if (outcome.status === 'ignored') popup?.close();
    },
    disconnect: async (id: ChatGptConnectionId) => {
      await perform(() =>
        disconnectAction({ connectionId: id }).then((result) =>
          result.revoked
            ? 'ChatGPT disconnected.'
            : 'ChatGPT disconnected from Groam. Manage any remaining authorization in ChatGPT settings.'
        )
      );
    },
    selectConnection: async (id: ChatGptConnectionId) => {
      await perform(() => selectMutation({ connectionId: id }));
    },
    selectModel: async (model: string) => {
      if (connectionId) {
        await perform(() => selectMutation({ connectionId, model }), 'ChatGPT model saved.');
      }
    },
    acknowledge: async () => {
      await perform(() => acknowledgeMutation({}));
    }
  };
}
