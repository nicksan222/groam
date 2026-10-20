import { authClient } from '@groam/auth/client';
import { useShallow } from 'zustand/react/shallow';
import { errorMessage } from '@/lib/errors';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { isValidUsername, usernameRequirements } from '@/lib/username';

function signInWithIdentifier(identifier: string, password: string) {
  const callbackURL = window.location.origin + window.location.pathname;
  return identifier.includes('@')
    ? authClient.signIn.email({ callbackURL, email: identifier, password })
    : authClient.signIn.username({ callbackURL, password, username: identifier });
}

function needsEmailVerification(data: object | null) {
  return data && 'token' in data && !data.token;
}

function needsTwoFactor(data: object | null) {
  return data && 'twoFactorRedirect' in data && Boolean(data.twoFactorRedirect);
}

function isAuthenticatorCode(code: string) {
  return /^\d{6}$/u.test(code);
}

function authenticationValidationError({
  identifier,
  isSignIn,
  name,
  password
}: {
  identifier: string;
  isSignIn: boolean;
  name: string;
  password: string;
}) {
  if (!identifier || !password || (!isSignIn && !name.trim())) {
    return 'Complete every required field to continue.';
  }
  if (password.length < 8) return 'Your password must be at least 8 characters.';
  return null;
}

export function useAuthForm() {
  const state = useAuthFormStore(
    useShallow((store) => ({
      email: store.email,
      message: store.message,
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

    await authenticate();
  };

  const authenticate = async () => {
    const validationError = authenticationValidationError({
      identifier: state.identifier,
      isSignIn,
      name: state.name,
      password: state.password
    });
    if (validationError) {
      patch({ error: validationError });
      return;
    }

    patch({ error: null, isPending: true });
    try {
      const identifier = state.identifier.trim();
      const result = isSignIn
        ? await signInWithIdentifier(identifier, state.password)
        : await signUp(identifier);
      if (result.error) {
        throw new Error(result.error.message ?? 'Authentication failed');
      }
      if (!isSignIn && needsEmailVerification(result.data)) {
        patch({ message: 'Check your email to verify your account, then sign in.', password: '' });
      }
      if (needsTwoFactor(result.data)) {
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
        code: state.recoveryCode.trim(),
        newPassword: state.newPassword,
        username: state.identifier.trim()
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
    if (!isValidUsername(username)) throw new Error(usernameRequirements);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(state.email.trim())) {
      throw new Error('Enter a valid email address.');
    }
    return await authClient.signUp.email({
      callbackURL: window.location.origin + window.location.pathname,
      email: state.email.trim(),
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
      const result = isAuthenticatorCode(code)
        ? await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
        : await authClient.twoFactor.verifyBackupCode({ code, trustDevice: false });
      if (result.error) throw new Error(result.error.message ?? 'Invalid verification code');
      patch({ needsTwoFactor: false, twoFactorCode: '' });
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
