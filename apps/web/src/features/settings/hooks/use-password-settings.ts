import { authClient } from '@groam/auth/client';
import { useShallow } from 'zustand/react/shallow';
import { errorMessage } from '@/lib/errors';
import { usePasswordSettingsStore } from '@/lib/stores/settings-stores';

export function usePasswordSettings() {
  const state = usePasswordSettingsStore(
    useShallow((store) => ({
      confirmPassword: store.confirmPassword,
      currentPassword: store.currentPassword,
      error: store.error,
      isPending: store.isPending,
      message: store.message,
      newPassword: store.newPassword
    }))
  );
  const patch = usePasswordSettingsStore((store) => store.patch);

  const save = async () => {
    if (state.newPassword.length < 8) {
      patch({ error: 'Your new password must be at least 8 characters.', message: null });
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      patch({ error: 'The new passwords do not match.', message: null });
      return;
    }

    patch({ error: null, isPending: true, message: null });
    try {
      const result = await authClient.changePassword({
        currentPassword: state.currentPassword,
        newPassword: state.newPassword,
        revokeOtherSessions: true
      });
      if (result.error) throw new Error(result.error.message ?? 'Unable to change password');
      patch({
        confirmPassword: '',
        currentPassword: '',
        message: 'Password updated. Other sessions have been signed out.',
        newPassword: ''
      });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Unable to change password') });
    } finally {
      patch({ isPending: false });
    }
  };

  return { save, state, updateState: patch };
}
