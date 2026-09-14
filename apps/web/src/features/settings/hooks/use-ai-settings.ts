import {
  type AiKeyProviderId,
  aiKeyProvider,
  isAiKeyProviderId
} from '@groam/ai-contracts/providers/keys';
import { api } from '@groam/backend/api';
import { useMutation, useQuery } from 'convex/react';
import { useShallow } from 'zustand/react/shallow';
import { errorMessage } from '@/lib/errors';
import { useAiSettingsDraftStore } from '@/lib/stores/settings-stores';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type RemoteAiSettings = {
  baseUrl: string | null;
  canManage: boolean;
  configured: boolean;
  fromEnvironment: boolean;
  model: string | null;
  provider: AiKeyProviderId | null;
};

export function useAiSettings() {
  const remote = useQuery(api.routes.settings.ai.get.run, {});
  const saveMutation = useMutation(api.routes.settings.ai.set.run);
  const draft = useAiSettingsDraftStore(
    useShallow((store) => ({
      apiKey: store.apiKey,
      baseUrl: store.baseUrl,
      error: store.error,
      isPending: store.isPending,
      message: store.message,
      model: store.model,
      provider: store.provider
    }))
  );
  const patch = useAiSettingsDraftStore((store) => store.patch);
  const selectProviderInStore = useAiSettingsDraftStore((store) => store.selectProvider);
  const provider = displayedProvider(draft, remote);
  const preset = aiKeyProvider(provider);
  const model = displayedModel(draft, remote);
  const baseUrl = displayedBaseUrl(draft, remote, preset);
  const hasNewKey = draft.apiKey.trim().length > 0;
  const canSave =
    hasNewKey ||
    Boolean(remote?.configured && provider === remote.provider) ||
    Boolean(preset.requiresBaseUrl && !remote?.configured);

  const write = async (apiKey: string | null) => {
    patch({ error: null, isPending: true, message: null });
    try {
      await saveMutation({
        apiKey,
        baseUrl: preset.requiresBaseUrl ? baseUrl.trim() || null : null,
        model: model.trim() || null,
        provider
      });
      patch({
        apiKey: '',
        baseUrl: null,
        message:
          apiKey === null ? 'AI key removed.' : apiKey ? 'AI key saved.' : 'AI settings saved.',
        model: null,
        provider: null
      });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Unable to save the AI key') });
    } finally {
      patch({ isPending: false });
    }
  };

  return {
    canManage: remote?.canManage ?? false,
    canSave,
    configured: remote?.configured ?? false,
    fromEnvironment: remote?.fromEnvironment ?? false,
    draft,
    isLoading: remote === undefined,
    baseUrl,
    model,
    preset,
    provider,
    remove: () => write(null),
    save: () => write(draft.apiKey.trim()),
    selectProvider: (value: string) => {
      if (!isAiKeyProviderId(value) || value === provider) return;
      selectProviderInStore(value);
    },
    updateDraft: patch
  };
}

function displayedProvider(
  draft: { provider: AiKeyProviderId | null },
  remote: RemoteAiSettings | undefined
): AiKeyProviderId {
  return draft.provider ?? remote?.provider ?? 'openai';
}

function displayedModel(
  draft: { model: string | null; provider: AiKeyProviderId | null },
  remote: RemoteAiSettings | undefined
): string {
  if (draft.model !== null) return draft.model;
  return displayedProvider(draft, remote) === remote?.provider ? (remote.model ?? '') : '';
}

function displayedBaseUrl(
  draft: { baseUrl: string | null; provider: AiKeyProviderId | null },
  remote: RemoteAiSettings | undefined,
  preset: { baseURL?: string }
): string {
  if (draft.baseUrl !== null) return draft.baseUrl;
  if (displayedProvider(draft, remote) === remote?.provider) return remote.baseUrl ?? '';
  return preset.baseURL ?? '';
}
