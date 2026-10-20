import { authClient } from '@groam/auth/client';
import { useState } from 'react';
import { errorMessage } from '@/lib/errors';

export function useEmailSettings() {
  const [state, setState] = useState({
    email: '',
    error: null as string | null,
    message: null as string | null,
    pending: false
  });
  const setEmail = (email: string) =>
    setState((previous) => ({ ...previous, email, error: null, message: null }));
  const save = async () => {
    const email = state.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      setState((previous) => ({ ...previous, error: 'Enter a valid email address.' }));
      return;
    }
    setState((previous) => ({ ...previous, pending: true, error: null, message: null }));
    try {
      const result = await authClient.changeEmail({
        newEmail: email,
        callbackURL: window.location.origin + window.location.pathname
      });
      if (result.error) throw new Error(result.error.message ?? 'Unable to change email');
      setState((previous) => ({
        ...previous,
        message: 'Check your new inbox. Your email will change only after you verify the link.'
      }));
    } catch (cause) {
      setState((previous) => ({
        ...previous,
        error: errorMessage(cause, 'Unable to change email. Sign in again and retry.')
      }));
    } finally {
      setState((previous) => ({ ...previous, pending: false }));
    }
  };
  return { state, setEmail, save };
}
