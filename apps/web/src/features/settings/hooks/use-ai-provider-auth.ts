import type { AiKeyProviderId } from '@groam/ai-contracts/providers/keys';
import { api } from '@groam/backend/api';
import { useMutation } from 'convex/react';
import { useCallback, useEffect, useRef } from 'react';
import { aiProviderAuthStrategy } from '@/features/settings/ai-provider-auth/registry';
import { errorMessage } from '@/lib/errors';
import { useAiProviderAuthStore, useAiSettingsDraftStore } from '@/lib/stores/settings-stores';
import type { AiProviderAuthSession, AiProviderAuthTarget } from '@/types/ai-provider-auth';

function replaceCallbackUrl(url: URL) {
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function organizationChanged(session: AiProviderAuthSession, organizationId: string | null) {
  return session.target === 'organization' && session.organizationId !== organizationId;
}

export function useAiProviderAuth(
  provider: AiKeyProviderId,
  target: AiProviderAuthTarget,
  organizationId: string | null
) {
  const saveMutation = useMutation(api.routes.settings.ai.set.run);
  const patch = useAiSettingsDraftStore((state) => state.patch);
  const strategy = aiProviderAuthStrategy(provider);
  const pendingKey = useRef<{ apiKey: string; session: AiProviderAuthSession } | null>(null);
  const completion = useRef<Promise<void> | null>(null);
  const callbackSession = useAiProviderAuthStore((state) => state.session);
  const callbackStrategy = callbackSession
    ? aiProviderAuthStrategy(callbackSession.provider)
    : null;
  const connectionStrategy =
    callbackStrategy &&
    (pendingKey.current || callbackStrategy.hasCallback(new URL(window.location.href)))
      ? callbackStrategy
      : strategy;

  const runCompletion = useCallback(async () => {
    const url = new URL(window.location.href);
    const authStore = useAiProviderAuthStore.getState();
    const pending = pendingKey.current;
    const session = pending?.session ?? authStore.session;
    if (!session) return;
    const completionStrategy = aiProviderAuthStrategy(session.provider);
    if (!completionStrategy || (!pending && !completionStrategy.hasCallback(url))) return;
    if (organizationChanged(session, organizationId)) {
      patch({
        error: 'Switch back to the organization where this connection started, then try again.',
        isPending: false
      });
      return;
    }
    patch({ error: null, isPending: true, message: null });
    try {
      const apiKey =
        pending?.apiKey ?? (await completionStrategy.complete(new URL(url), session.data));
      pendingKey.current = { apiKey, session };
      completionStrategy.clearCallback(url);
      replaceCallbackUrl(url);
      await saveMutation({
        apiKey,
        baseUrl: null,
        model: null,
        ...(session.target === 'organization'
          ? { organizationId: session.organizationId, target: session.target }
          : {}),
        provider: session.provider
      });
      pendingKey.current = null;
      authStore.setSession(null);
      patch({
        apiKey: '',
        baseUrl: null,
        message: completionStrategy.connectedMessage,
        model: null,
        provider: null
      });
    } catch (error) {
      patch({ error: errorMessage(error, `Unable to connect ${session.provider}`) });
    } finally {
      patch({ isPending: false });
    }
  }, [organizationId, patch, saveMutation]);

  const complete = useCallback(async () => {
    if (!completion.current) {
      completion.current = runCompletion().finally(() => {
        completion.current = null;
      });
    }
    await completion.current;
  }, [runCompletion]);

  useEffect(() => {
    void complete();
  }, [complete]);

  if (!connectionStrategy) return null;
  return {
    connect: async () => {
      const session = useAiProviderAuthStore.getState().session;
      if (
        session &&
        (pendingKey.current || connectionStrategy.hasCallback(new URL(window.location.href)))
      ) {
        await complete();
        return;
      }
      patch({ error: null, isPending: true, message: null });
      try {
        const start = await connectionStrategy.begin(
          `${window.location.origin}${window.location.pathname}`
        );
        useAiProviderAuthStore.getState().setSession({
          data: start.data,
          organizationId: target === 'organization' ? organizationId : null,
          provider: connectionStrategy.provider,
          target
        });
        window.location.assign(start.authorizationUrl);
      } catch (error) {
        useAiProviderAuthStore.getState().setSession(null);
        patch({
          error: errorMessage(error, `Unable to start ${connectionStrategy.provider} connection`),
          isPending: false
        });
      }
    },
    label: connectionStrategy.connectLabel
  };
}
