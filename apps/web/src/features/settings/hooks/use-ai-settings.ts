import { aiKeyProvider, isAiKeyProviderId } from '@groam/ai-contracts/providers/keys';
import { api } from '@groam/backend/api';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAiProviderAuth } from '@/features/settings/hooks/use-ai-provider-auth';
import { errorMessage } from '@/lib/errors';
import { useAiSettingsDraftStore } from '@/lib/stores/settings-stores';
import type { AiProviderAuthTarget } from '@/types/ai-provider-auth';

// biome-ignore lint/plugin/no-local-type-definitions: derived Convex return type
type Remote = FunctionReturnType<typeof api.routes.settings.ai.get.run>;
// biome-ignore lint/plugin/no-local-type-definitions: derived settings-store slice
type AiDraft = Pick<
  ReturnType<typeof useAiSettingsDraftStore.getState>,
  'apiKey' | 'baseUrl' | 'error' | 'isPending' | 'message' | 'model' | 'provider'
>;

function effectiveSettings(remote: Remote | undefined) {
  if (remote?.effectiveSource === 'personal') return remote.personal;
  if (remote?.effectiveSource === 'organization') return remote.organization;
  return undefined;
}

function deriveAiSettings(
  remote: Remote | undefined,
  target: AiProviderAuthTarget,
  draft: AiDraft
) {
  const selected = remote?.[target];
  const provider = draft.provider ?? selected?.provider ?? 'openrouter';
  const preset = aiKeyProvider(provider);
  const model = draft.model ?? (provider === selected?.provider ? (selected.model ?? '') : '');
  const baseUrl =
    draft.baseUrl ??
    (provider === selected?.provider ? (selected.baseUrl ?? '') : (preset.baseURL ?? ''));
  const configured = selected?.configured ?? false;
  const canSave = Boolean(
    draft.apiKey.trim() ||
      (configured && provider === selected?.provider) ||
      (preset.requiresBaseUrl && !configured)
  );
  return {
    baseUrl,
    canSave,
    configured,
    effective: effectiveSettings(remote),
    model,
    preset,
    provider
  };
}

function useAiSettingsWriter({
  baseUrl,
  model,
  organizationId,
  provider,
  requiresBaseUrl,
  target
}: {
  baseUrl: string;
  model: string;
  organizationId: string | null;
  provider: ReturnType<typeof aiKeyProvider>['id'];
  requiresBaseUrl: boolean;
  target: AiProviderAuthTarget;
}) {
  const saveMutation = useMutation(api.routes.settings.ai.set.run);
  const patch = useAiSettingsDraftStore((state) => state.patch);

  return async (apiKey: string | null, writeTarget = target) => {
    patch({ error: null, isPending: true, message: null });
    try {
      await saveMutation({
        apiKey,
        baseUrl: requiresBaseUrl ? baseUrl.trim() || null : null,
        model: model.trim() || null,
        ...(writeTarget === 'organization' ? { organizationId } : {}),
        provider,
        ...(writeTarget === 'organization' ? { target: writeTarget } : {})
      });
      let message = 'AI settings saved.';
      if (apiKey === null) message = 'AI key removed.';
      else if (apiKey) message = 'AI key saved.';
      patch({ apiKey: '', baseUrl: null, message, model: null, provider: null });
    } catch (error) {
      patch({ error: errorMessage(error, 'Unable to save the AI key') });
    } finally {
      patch({ isPending: false });
    }
  };
}

export function useAiSettings() {
  const remote = useQuery(api.routes.settings.ai.get.run, {}) as Remote | undefined;
  const [target, setTargetState] = useState<AiProviderAuthTarget>('personal');
  const draft = useAiSettingsDraftStore(
    useShallow((s) => ({
      apiKey: s.apiKey,
      baseUrl: s.baseUrl,
      error: s.error,
      isPending: s.isPending,
      message: s.message,
      model: s.model,
      provider: s.provider
    }))
  );
  const patch = useAiSettingsDraftStore((s) => s.patch);
  const selectProviderInStore = useAiSettingsDraftStore((s) => s.selectProvider);
  const { baseUrl, canSave, configured, effective, model, preset, provider } = deriveAiSettings(
    remote,
    target,
    draft
  );
  const effectiveSource = remote?.effectiveSource ?? 'unconfigured';
  const organizationId = remote?.organizationId ?? null;
  const providerConnection = useAiProviderAuth(provider, target, organizationId);
  const write = useAiSettingsWriter({
    baseUrl,
    model,
    organizationId,
    provider,
    requiresBaseUrl: Boolean(preset.requiresBaseUrl),
    target
  });

  return {
    baseUrl,
    canManageOrganization: remote?.canManageOrganization ?? false,
    canSave,
    configured,
    draft,
    effectiveModel: effective?.model ?? null,
    effectiveProvider: effective?.provider ?? null,
    effectiveSource,
    environmentConfigured: remote?.environmentConfigured ?? false,
    fromEnvironment: remote?.environmentConfigured ?? false,
    isLoading: remote === undefined,
    model,
    organizationConfigured: remote?.organization.configured ?? false,
    preset,
    provider,
    providerConnection,
    remove: () => write(null),
    save: () => write(draft.apiKey.trim()),
    selectProvider: (value: string) => {
      if (isAiKeyProviderId(value) && value !== provider) selectProviderInStore(value);
    },
    setTarget: (value: string) => {
      if (value === 'personal' || (value === 'organization' && remote?.canManageOrganization)) {
        useAiSettingsDraftStore.getState().resetDraft();
        setTargetState(value);
      }
    },
    target,
    updateDraft: patch
  };
}
