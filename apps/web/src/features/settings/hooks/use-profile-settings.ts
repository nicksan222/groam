import { authClient } from '@groam/auth/client';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';
import { errorMessage } from '@/lib/errors';
import { useProfileSettingsStore } from '@/lib/stores/settings-stores';

export function useProfileSettings(user: Session['user']) {
  const state = useProfileSettingsStore(
    useShallow((store) => ({
      error: store.error,
      image: store.image,
      isPending: store.isPending,
      message: store.message,
      name: store.name,
      username: store.username
    }))
  );
  const patch = useProfileSettingsStore((store) => store.patch);
  const resetFromUser = useProfileSettingsStore((store) => store.resetFromUser);

  useEffect(() => {
    resetFromUser(user);
  }, [resetFromUser, user]);

  const save = async () => {
    if (!/^[a-zA-Z0-9_.]{3,30}$/u.test(state.username)) {
      patch({ error: 'Use 3–30 letters, numbers, underscores, or dots for your username.' });
      return;
    }
    patch({ error: null, isPending: true, message: null });
    try {
      const result = await authClient.updateUser({
        image: state.image.trim() || null,
        name: state.name.trim(),
        username: state.username.trim()
      });
      if (result.error) throw new Error(result.error.message ?? 'Unable to update profile');
      patch({ message: 'Profile saved.' });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Unable to update profile') });
    } finally {
      patch({ isPending: false });
    }
  };

  return { save, state, updateState: patch };
}
