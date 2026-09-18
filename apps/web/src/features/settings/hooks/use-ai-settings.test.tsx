import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAiProviderAuthStore, useAiSettingsDraftStore } from '@/lib/stores/settings-stores';
import { useAiSettings } from './use-ai-settings';

const convex = vi.hoisted(() => ({
  save: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', () => ({
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

type StoredSettings = {
  baseUrl: string | null;
  configured: boolean;
  model: string | null;
  provider: 'anthropic' | 'compatible' | 'google' | 'openai' | 'openrouter' | null;
};

function remoteSettings({
  canManageOrganization = true,
  environmentConfigured = false,
  organization = {},
  personal = {}
}: {
  canManageOrganization?: boolean;
  environmentConfigured?: boolean;
  organization?: Partial<StoredSettings>;
  personal?: Partial<StoredSettings>;
} = {}) {
  const empty = { baseUrl: null, configured: false, model: null, provider: null } as const;
  const personalSettings = { ...empty, ...personal };
  const organizationSettings = { ...empty, ...organization };
  return {
    canManageOrganization,
    effectiveSource: environmentConfigured
      ? ('deployment' as const)
      : personalSettings.configured
        ? ('personal' as const)
        : organizationSettings.configured
          ? ('organization' as const)
          : ('unconfigured' as const),
    environmentConfigured,
    organizationId: 'organization-a',
    organization: organizationSettings,
    personal: personalSettings
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  useAiSettingsDraftStore.getState().resetDraft();
  useAiProviderAuthStore.getState().setSession(null);
  convex.useMutation.mockReturnValue(convex.save);
  convex.useQuery.mockReturnValue(remoteSettings());
  convex.save.mockResolvedValue(null);
});

describe('useAiSettings', () => {
  test('recommends OpenRouter when the user has no personal connection', () => {
    const { result } = renderHook(() => useAiSettings());
    expect(result.current.provider).toBe('openrouter');
  });

  test('saves an OpenRouter key and optional model', async () => {
    const { result } = renderHook(() => useAiSettings());
    act(() =>
      result.current.updateDraft({
        apiKey: ' sk-or-test ',
        model: ' anthropic/claude-sonnet-4 ',
        provider: 'openrouter'
      })
    );

    await act(() => result.current.save());

    expect(convex.save).toHaveBeenCalledWith({
      apiKey: 'sk-or-test',
      baseUrl: null,
      model: 'anthropic/claude-sonnet-4',
      provider: 'openrouter'
    });
    expect(result.current.draft).toMatchObject({
      apiKey: '',
      error: null,
      isPending: false,
      message: 'AI key saved.'
    });
  });

  test('removes a stored key', async () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({ personal: { configured: true, provider: 'openai' } })
    );
    const { result } = renderHook(() => useAiSettings());

    await act(() => result.current.remove());

    expect(convex.save).toHaveBeenCalledWith({
      apiKey: null,
      baseUrl: null,
      model: null,
      provider: 'openai'
    });
    expect(result.current.draft.message).toBe('AI key removed.');
    expect(result.current.configured).toBe(true);
    expect(result.current.fromEnvironment).toBe(false);
    expect(result.current.provider).toBe('openai');
  });

  test('saves and removes the selected organization connection explicitly', async () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({
        organization: { configured: true, provider: 'openai' }
      })
    );
    const { result } = renderHook(() => useAiSettings());

    act(() => result.current.setTarget('organization'));
    act(() => result.current.updateDraft({ apiKey: 'sk-shared-new' }));
    await act(() => result.current.save());
    expect(convex.save).toHaveBeenLastCalledWith({
      apiKey: 'sk-shared-new',
      baseUrl: null,
      model: null,
      organizationId: 'organization-a',
      provider: 'openai',
      target: 'organization'
    });

    await act(() => result.current.remove());
    expect(convex.save).toHaveBeenLastCalledWith({
      apiKey: null,
      baseUrl: null,
      model: null,
      organizationId: 'organization-a',
      provider: 'openai',
      target: 'organization'
    });
  });

  test('does not let a member select the organization target', () => {
    convex.useQuery.mockReturnValue(remoteSettings({ canManageOrganization: false }));
    const { result } = renderHook(() => useAiSettings());

    act(() => result.current.setTarget('organization'));

    expect(result.current.target).toBe('personal');
  });

  test('uses the backend-selected personal source over an organization fallback', () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({
        organization: { configured: true, model: 'gpt-4.1-mini', provider: 'openai' },
        personal: { configured: true, model: 'claude-sonnet-4-5', provider: 'anthropic' }
      })
    );
    const { result } = renderHook(() => useAiSettings());

    expect(result.current.effectiveSource).toBe('personal');
    expect(result.current.effectiveProvider).toBe('anthropic');
    expect(result.current.effectiveModel).toBe('claude-sonnet-4-5');
  });

  test('exposes when Convex env is supplying AI credentials', () => {
    convex.useQuery.mockReturnValue(remoteSettings({ environmentConfigured: true }));
    const { result } = renderHook(() => useAiSettings());
    expect(result.current.fromEnvironment).toBe(true);
    expect(result.current.configured).toBe(false);
  });

  test('surfaces save failures', async () => {
    convex.save.mockRejectedValue(
      new Error('Only organization owners and admins can manage group settings')
    );
    const { result } = renderHook(() => useAiSettings());

    await act(() => result.current.save());

    expect(result.current.draft.error).toBe(
      'Only organization owners and admins can manage group settings'
    );
  });

  test('keeps the saved model while the provider stays the same', () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({
        personal: { configured: true, model: 'gpt-4.1-mini', provider: 'openai' }
      })
    );
    const { result } = renderHook(() => useAiSettings());
    expect(result.current.provider).toBe('openai');
    expect(result.current.model).toBe('gpt-4.1-mini');
  });

  test('does not keep a saved model after switching providers', async () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({
        personal: { configured: true, model: 'gpt-4.1-mini', provider: 'openai' }
      })
    );
    const { result } = renderHook(() => useAiSettings());

    act(() => result.current.selectProvider('openrouter'));
    expect(result.current.provider).toBe('openrouter');
    expect(result.current.model).toBe('');

    act(() => result.current.updateDraft({ apiKey: 'sk-or-new' }));
    await act(() => result.current.save());

    expect(convex.save).toHaveBeenCalledWith({
      apiKey: 'sk-or-new',
      baseUrl: null,
      model: null,
      provider: 'openrouter'
    });
  });

  test('saves a model change without sending a new key', async () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({
        personal: { configured: true, model: 'gpt-4.1-mini', provider: 'openai' }
      })
    );
    const { result } = renderHook(() => useAiSettings());
    expect(result.current.canSave).toBe(true);

    act(() => result.current.updateDraft({ model: 'gpt-4.1' }));
    await act(() => result.current.save());

    expect(convex.save).toHaveBeenCalledWith({
      apiKey: '',
      baseUrl: null,
      model: 'gpt-4.1',
      provider: 'openai'
    });
    expect(result.current.draft.message).toBe('AI settings saved.');
  });

  test('requires a new key after switching providers', () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({
        personal: { configured: true, model: 'gpt-4.1-mini', provider: 'openai' }
      })
    );
    const { result } = renderHook(() => useAiSettings());

    act(() => result.current.selectProvider('anthropic'));
    expect(result.current.canSave).toBe(false);
  });

  test('requires a new key after switching from OpenAI to a local host', () => {
    convex.useQuery.mockReturnValue(
      remoteSettings({
        personal: { configured: true, model: 'gpt-4.1-mini', provider: 'openai' }
      })
    );
    const { result } = renderHook(() => useAiSettings());

    act(() => result.current.selectProvider('compatible'));
    expect(result.current.canSave).toBe(false);
  });

  test('saves a local OpenAI-compatible host with a base URL', async () => {
    const { result } = renderHook(() => useAiSettings());
    act(() => result.current.selectProvider('compatible'));
    expect(result.current.canSave).toBe(true);
    expect(result.current.baseUrl).toBe('http://127.0.0.1:11434/v1');

    act(() =>
      result.current.updateDraft({
        apiKey: 'ollama',
        baseUrl: ' http://127.0.0.1:1234/v1 ',
        model: 'llama3.2'
      })
    );
    await act(() => result.current.save());

    expect(convex.save).toHaveBeenCalledWith({
      apiKey: 'ollama',
      baseUrl: 'http://127.0.0.1:1234/v1',
      model: 'llama3.2',
      provider: 'compatible'
    });
  });
});
