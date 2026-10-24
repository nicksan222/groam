import { authClient } from '@groam/auth/client';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';
import { errorMessage } from '@/lib/errors';
import { useProfileSettingsStore } from '@/lib/stores/settings-stores';
import { isValidUsername, usernameRequirements } from '@/lib/username';

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
    if (!isValidUsername(state.username)) {
      patch({ error: usernameRequirements });
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
