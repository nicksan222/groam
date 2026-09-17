import { authClient } from '@groam/auth/client';
import { useShallow } from 'zustand/react/shallow';
import { errorMessage } from '@/lib/errors';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';

export function useAuthForm() {
  const state = useAuthFormStore(
    useShallow((store) => ({
      error: store.error,
      flow: store.flow,
      identifier: store.identifier,
      isPending: store.isPending,
      name: store.name,
      newPassword: store.newPassword,
      needsTwoFactor: store.needsTwoFactor,
      password: store.password,
      recoveryCode: store.recoveryCode,
      twoFactorCode: store.twoFactorCode
    }))
  );
  const patch = useAuthFormStore((store) => store.patch);
  const switchFlow = useAuthFormStore((store) => store.switchFlow);
  const switchToRecovery = useAuthFormStore((store) => store.switchToRecovery);
  const isSignIn = state.flow === 'signIn';
  const isRecovery = state.flow === 'recover';

  const submit = async () => {
    if (isRecovery) {
      await recoverAccount();
      return;
    }
    if (state.needsTwoFactor) {
      await verifyTwoFactor();
      return;
    }
    if (!state.identifier || !state.password || (!isSignIn && !state.name.trim())) {
      patch({ error: 'Complete every required field to continue.' });
      return;
    }
    if (state.password.length < 8) {
      patch({ error: 'Your password must be at least 8 characters.' });
      return;
    }

    patch({ error: null, isPending: true });
    try {
      const identifier = state.identifier.trim();
      const result = isSignIn
        ? identifier.includes('@')
          ? await authClient.signIn.email({ email: identifier, password: state.password })
          : await authClient.signIn.username({ password: state.password, username: identifier })
        : await signUp(identifier);
      if (result.error) {
        throw new Error(result.error.message ?? 'Authentication failed');
      }
      if (result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect) {
        patch({ needsTwoFactor: true, password: '' });
      }
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Authentication failed') });
    } finally {
      patch({ isPending: false });
    }
  };

  const recoverAccount = async () => {
    if (!state.identifier.trim() || !state.recoveryCode.trim() || !state.newPassword) {
      patch({ error: 'Complete every required field to continue.' });
      return;
    }
    if (state.newPassword.length < 8) {
      patch({ error: 'Your password must be at least 8 characters.' });
      return;
    }
    patch({ error: null, isPending: true });
    try {
      const result = await authClient.accountRecovery.resetPassword({
        code: state.recoveryCode,
        newPassword: state.newPassword,
        username: state.identifier
      });
      if (result.error) throw new Error(result.error.message ?? 'Account recovery failed');
      patch({
        flow: 'signIn',
        newPassword: '',
        password: '',
        recoveryCode: ''
      });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Account recovery failed') });
    } finally {
      patch({ isPending: false });
    }
  };

  const signInWithPasskey = async () => {
    patch({ error: null, isPending: true });
    try {
      const result = await authClient.signIn.passkey();
      if (result?.error) throw new Error(result.error.message ?? 'Passkey sign-in failed');
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Passkey sign-in failed') });
    } finally {
      patch({ isPending: false });
    }
  };

  const signUp = async (username: string) => {
    if (!/^[a-zA-Z0-9_.]{3,30}$/u.test(username)) {
      throw new Error('Use 3–30 letters, numbers, underscores, or dots for your username.');
    }
    return await authClient.signUp.email({
      email: `${crypto.randomUUID()}@users.invalid`,
      name: state.name.trim(),
      password: state.password,
      username
    });
  };

  const verifyTwoFactor = async () => {
    const code = state.twoFactorCode.trim();
    if (!code) {
      patch({ error: 'Enter an authenticator or backup code.' });
      return;
    }
    patch({ error: null, isPending: true });
    try {
      const totp = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
      if (!totp.error) return;
      const backup = await authClient.twoFactor.verifyBackupCode({ code, trustDevice: false });
      if (backup.error) throw new Error(backup.error.message ?? 'Invalid verification code');
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Invalid verification code') });
    } finally {
      patch({ isPending: false });
    }
  };

  return {
    isRecovery,
    isSignIn,
    signInWithPasskey,
    state,
    submit,
    switchFlow,
    switchToRecovery,
    updateState: patch
  };
}
