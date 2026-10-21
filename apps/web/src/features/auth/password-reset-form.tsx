import { authClient } from '@groam/auth/client';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useRef, useState, type FormEvent } from 'react';
import { emailCallbackURL } from '@/lib/email';
import { errorMessage } from '@/lib/errors';

const invalidLink = 'This reset link is invalid or expired. Request another email.';

/** Resets the password; resolves to an error message, or null once it is reset. */
async function resetPassword(password: string, token: string): Promise<string | null> {
  if (password.length < 8 || password.length > 128)
    return 'Your password must be between 8 and 128 characters.';
  try {
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    return error ? (error.message ?? invalidLink) : null;
  } catch (cause) {
    return errorMessage(cause, invalidLink);
  }
}

/** Sets a new password from an emailed reset link. */
export function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  // The request that owns the form; a reset token works once, so a second submit waits for it.
  const activeRequest = useRef(0);
  const nextRequest = useRef(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const callbackURL = emailCallbackURL();

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    if (activeRequest.current) return;
    const request = ++nextRequest.current;
    activeRequest.current = request;
    setPending(true);
    setError(null);
    try {
      const failure = await resetPassword(password, token);
      if (activeRequest.current !== request) return;
      if (failure) {
        setError(failure);
        return;
      }
      setCompleted(true);
      setPassword('');
      window.history.replaceState(null, '', callbackURL);
    } finally {
      if (activeRequest.current === request) {
        activeRequest.current = 0;
        setPending(false);
      }
    }
  };

  if (completed) {
    return (
      <div className="flex flex-col gap-4">
        <FormFeedback message="Your password has been reset. You can now sign in." />
        <a className="text-sm underline underline-offset-4" href={callbackURL}>
          Return to sign in
        </a>
      </div>
    );
  }

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
