import { authClient } from '@groam/auth/client';
import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/errors';

function verifyChangedEmail(token: string) {
  return authClient.verifyEmail({ query: { token } });
}

export function useEmailSettings() {
  const [callback] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    return { token: search.get('emailChangeToken'), error: search.has('error') };
  });
  const verification = useRef<ReturnType<typeof verifyChangedEmail> | null>(null);
  const [state, setState] = useState({
    email: '',
    error: callback.error
      ? 'This email verification link is invalid or expired. Request a new link.'
      : (null as string | null),
    message: null as string | null,
    pending: Boolean(callback.token)
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    url.searchParams.delete('emailChangeToken');
    window.history.replaceState(window.history.state, '', url.href);
    if (!callback.token) return;
    verification.current ??= verifyChangedEmail(callback.token);
    let cancelled = false;
    void verification.current
      .then((result) => {
        if (cancelled) return;
        if (result.error) throw new Error(result.error.message ?? 'Unable to verify email');
        setState((previous) => ({
          ...previous,
          pending: false,
          error: null,
          message: 'Your new email address is verified.'
        }));
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          ...previous,
          pending: false,
          error: errorMessage(cause, 'Sign in again and reopen the email change link.')
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [callback]);
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
