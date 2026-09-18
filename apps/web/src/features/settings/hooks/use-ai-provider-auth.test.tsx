import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAiProviderAuthStore, useAiSettingsDraftStore } from '@/lib/stores/settings-stores';
import { useAiProviderAuth } from './use-ai-provider-auth';

const convex = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock('convex/react', () => ({
  useMutation: () => convex.save
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/settings/ai');
  useAiSettingsDraftStore.getState().resetDraft();
  useAiProviderAuthStore.getState().setSession(null);
  convex.save.mockResolvedValue(null);
});

describe('useAiProviderAuth', () => {
  test.each([
    ['personal', undefined, null],
    ['organization', 'organization', 'organization-a']
  ] as const)(
    'completes an OpenRouter callback for the %s target',
    async (target, savedTarget, organizationId) => {
      useAiProviderAuthStore.getState().setSession({
        data: { verifier: `${target}-verifier` },
        organizationId,
        provider: 'openrouter',
        target
      });
      window.history.replaceState({}, '', `/settings/ai?code=${target}-code`);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ key: `${target}-key` }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          })
        )
      );

      renderHook(() => useAiProviderAuth('openrouter', target, organizationId));

      await waitFor(() =>
        expect(convex.save).toHaveBeenCalledWith({
          apiKey: `${target}-key`,
          baseUrl: null,
          model: null,
          ...(organizationId ? { organizationId } : {}),
          provider: 'openrouter',
          ...(savedTarget ? { target: savedTarget } : {})
        })
      );
      expect(window.location.search).toBe('');
      expect(useAiProviderAuthStore.getState().session).toBeNull();
      expect(localStorage.length).toBe(0);
      expect(useAiSettingsDraftStore.getState().message).toBe('OpenRouter connected.');
    }
  );

  test('returns no connection for a provider without an authentication strategy', () => {
    const { result } = renderHook(() => useAiProviderAuth('openai', 'personal', null));

    expect(result.current).toBeNull();
    expect(convex.save).not.toHaveBeenCalled();
  });

  test('binds a new organization connection to its initiating organization', async () => {
    const { result } = renderHook(() =>
      useAiProviderAuth('openrouter', 'organization', 'organization-a')
    );

    await act(() => result.current?.connect());

    expect(useAiProviderAuthStore.getState().session).toMatchObject({
      organizationId: 'organization-a',
      provider: 'openrouter',
      target: 'organization'
    });
  });

  test('surfaces failures while starting a connection', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockRejectedValueOnce(new Error('Crypto unavailable'));
    const { result } = renderHook(() => useAiProviderAuth('openrouter', 'personal', null));

    await act(() => result.current?.connect());

    expect(useAiProviderAuthStore.getState().session).toBeNull();
    expect(useAiSettingsDraftStore.getState().error).toBe('Crypto unavailable');
  });

  test('retains an exchanged key in memory and retries a failed save', async () => {
    useAiProviderAuthStore.getState().setSession({
      data: { verifier: 'retry-verifier' },
      organizationId: null,
      provider: 'openrouter',
      target: 'personal'
    });
    window.history.replaceState({}, '', '/settings/ai?code=retry-code');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: 'retry-key' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    convex.save.mockRejectedValueOnce(new Error('Network unavailable'));
    const { result } = renderHook(() => useAiProviderAuth('openai', 'personal', null));

    await waitFor(() =>
      expect(useAiSettingsDraftStore.getState().error).toBe('Network unavailable')
    );
    expect(useAiProviderAuthStore.getState().session).not.toBeNull();

    await act(() => result.current?.connect());

    expect(convex.save).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAiProviderAuthStore.getState().session).toBeNull();
  });

  test('does not exchange an organization callback while another organization is active', async () => {
    useAiProviderAuthStore.getState().setSession({
      data: { verifier: 'organization-verifier' },
      organizationId: 'organization-a',
      provider: 'openrouter',
      target: 'organization'
    });
    window.history.replaceState({}, '', '/settings/ai?code=organization-code');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useAiProviderAuth('openai', 'organization', 'organization-b'));

    await waitFor(() => expect(useAiSettingsDraftStore.getState().error).toContain('Switch back'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?code=organization-code');
    expect(useAiProviderAuthStore.getState().session).not.toBeNull();
  });
});
