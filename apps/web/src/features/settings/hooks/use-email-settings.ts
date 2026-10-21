import { authClient } from '@groam/auth/client';
import { useEffect, useRef, useState } from 'react';
import { isEmail } from '@/lib/email';
import { errorMessage } from '@/lib/errors';

export function useEmailSettings() {
  const [token] = useState(() =>
    new URLSearchParams(window.location.search).get('emailChangeToken')
  );
  const [state, setState] = useState({
    email: '',
    error: null as string | null,
    isConfirming: Boolean(token),
    isPending: false,
    message: null as string | null
  });
  const patch = (next: Partial<typeof state>) => setState((s) => ({ ...s, ...next }));
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete('emailChangeToken');
    window.history.replaceState(window.history.state, '', url.href);
    const finish = (error: string | null) =>
      setState((s) => ({
        ...s,
        error,
        isConfirming: false,
        message: error ? null : 'Your new email address is verified.'
      }));
    const fallback = 'Sign in again and reopen the email change link.';
    authClient
      .verifyEmail({ query: { token } })
      .then(({ error }) => finish(error ? (error.message ?? fallback) : null))
      .catch((cause: unknown) => finish(errorMessage(cause, fallback)));
  }, [token]);

  const save = async () => {
    const email = state.email.trim();
    if (!isEmail(email)) {
      patch({ error: 'Enter a valid email address.' });
      return;
    }
    patch({ error: null, isPending: true, message: null });
    try {
      const result = await authClient.changeEmail({ newEmail: email });
      if (result.error) throw new Error(result.error.message ?? 'Unable to change email');
      patch({
        email: '',
        message: 'Check your new inbox. Your email will change only after you verify the link.'
      });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, 'Unable to change email. Sign in again and retry.') });
    } finally {
      patch({ isPending: false });
    }
  };

  return {
    save,
    setEmail: (email: string) => patch({ email, error: null, message: null }),
    state
  };
}
