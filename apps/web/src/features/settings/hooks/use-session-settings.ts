import { authClient } from '@groam/auth/client';
import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { errorMessage } from '@/lib/errors';
import { useSessionSettingsStore } from '@/lib/stores/settings-stores';

export function useSessionSettings() {
  const state = useSessionSettingsStore(
    useShallow((store) => ({
      error: store.error,
      isLoading: store.isLoading,
      pendingAction: store.pendingAction,
      sessions: store.sessions
    }))
  );
  const patch = useSessionSettingsStore((store) => store.patch);

  const refresh = useCallback(async () => {
    patch({ error: null, isLoading: true });
    try {
      const result = await authClient.listSessions();
      if (result.error) throw new Error(result.error.message ?? 'Unable to load sessions');
      patch({ sessions: result.data ?? [] });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Unable to load sessions') });
    } finally {
      patch({ isLoading: false });
    }
  }, [patch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const revoke = async (token: string) => {
    patch({ error: null, pendingAction: token });
    try {
      const result = await authClient.revokeSession({ token });
      if (result.error) throw new Error(result.error.message ?? 'Unable to sign out session');
      patch({ sessions: state.sessions.filter((session) => session.token !== token) });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Unable to sign out session') });
    } finally {
      patch({ pendingAction: null });
    }
  };

  const revokeOthers = async (currentToken: string) => {
    patch({ error: null, pendingAction: 'others' });
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to sign out other sessions');
      patch({ sessions: state.sessions.filter((session) => session.token === currentToken) });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Unable to sign out other sessions') });
    } finally {
      patch({ pendingAction: null });
    }
  };

  return { refresh, revoke, revokeOthers, state };
}
