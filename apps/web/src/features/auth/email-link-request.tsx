import { authClient } from '@groam/auth/client';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useRef, useState } from 'react';
import { emailCallbackURL, isEmail } from '@/lib/email';
import { errorMessage } from '@/lib/errors';

/** Requests a password reset or verification email; links return to this same auth screen. */
export function EmailLinkRequest() {
  const [email, setEmail] = useState('');
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).has('error')
      ? 'This email link is invalid or expired. Request another email.'
      : null
  );
  const [message, setMessage] = useState<string | null>(null);

  const send = async (verification: boolean) => {
    if (inFlight.current) return;
    const address = email.trim();
    if (!isEmail(address)) {
      setError('Enter a valid email address.');
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const callbackURL = emailCallbackURL();
      const resetURL = new URL(callbackURL);
      resetURL.searchParams.set('auth', 'reset-password');
      const result = verification
        ? await authClient.sendVerificationEmail({ callbackURL, email: address })
        : await authClient.requestPasswordReset({ email: address, redirectTo: resetURL.href });
      if (result.error) throw new Error(result.error.message ?? 'Unable to send email');
      setMessage(
        'If this address is eligible, an email is on its way. Check your inbox and spam folder.'
      );
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to send email. Try again.'));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

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
