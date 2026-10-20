import { authClient } from '@groam/auth/client';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useRef, useState, type FormEvent } from 'react';
import { errorMessage } from '@/lib/errors';

/** Email links return to this same public auth screen, including deployments under /app/. */
export function EmailRecovery({ token }: { token: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const inFlight = useRef(false);
  const requestVersion = useRef(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).has('error')
      ? 'This email link is invalid or expired. Request another email.'
      : null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const callbackURL = window.location.origin + window.location.pathname;

  const resetCallbackURL = new URL(callbackURL);
  resetCallbackURL.searchParams.set('auth', 'reset-password');

  const send = async (verification: boolean) => {
    if (inFlight.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    const version = ++requestVersion.current;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = verification
        ? await authClient.sendVerificationEmail({ callbackURL, email: email.trim() })
        : await authClient.requestPasswordReset({
            email: email.trim(),
            redirectTo: resetCallbackURL.href
          });
      if (result.error) throw new Error(result.error.message ?? 'Unable to send email');
      setMessage(
        'If this address is eligible, an email is on its way. Check your inbox and spam folder.'
      );
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to send email. Try again.'));
    } finally {
      if (requestVersion.current === version) {
        inFlight.current = false;
        setPending(false);
      }
    }
  };

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (password.length < 8 || password.length > 128) {
      setError('Your password must be between 8 and 128 characters.');
      return;
    }
    const version = ++requestVersion.current;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token: token ?? '' });
      if (result.error) throw new Error(result.error.message ?? 'Unable to reset password');
      setCompleted(true);
      setPassword('');
      window.history.replaceState(null, '', callbackURL);
      setMessage('Your password has been reset. You can now sign in.');
    } catch (cause) {
      setError(
        errorMessage(cause, 'This reset link is invalid or expired. Request another email.')
      );
    } finally {
      if (requestVersion.current === version) {
        inFlight.current = false;
        setPending(false);
      }
    }
  };

  if (completed) {
    return (
      <div className="flex flex-col gap-4">
        <FormFeedback message={message} />
        <a className="text-sm underline underline-offset-4" href={callbackURL}>
          Return to sign in
        </a>
      </div>
    );
  }

  if (token) {
    return (
      <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void reset(event)}>
        <FormField label="New password" required description="Use between 8 and 128 characters.">
          <Input
            autoComplete="new-password"
            type="password"
            value={password}
            disabled={pending}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </FormField>
        <FormFeedback error={error} />
        <Button type="submit" disabled={pending}>
          {pending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    );
  }

  return (
    <details className="mt-5 text-sm" open={error ? true : undefined}>
      <summary className="cursor-pointer font-medium">
        Forgot your password or need a verification email?
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        <FormField label="Account email" required>
          <Input
            autoComplete="email"
            type="email"
            value={email}
            disabled={pending}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <FormFeedback error={error} message={message} />
        <Button disabled={pending} onClick={() => void send(false)} variant="outline">
          Send password reset email
        </Button>
        <Button disabled={pending} onClick={() => void send(true)} variant="ghost">
          Resend verification email
        </Button>
      </div>
    </details>
  );
}
