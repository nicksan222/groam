import { authClient } from '@groam/auth/client';
import { Button } from '@groam/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@groam/ui/components/collapsible';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import { emailCallbackURL, isEmail } from '@/lib/email';

/** Requests a password reset or verification email; links return to this same auth screen. */
export function EmailLinkRequest() {
  const [email, setEmail] = useState('');
  const form = useFormSubmit({ fallbackError: 'Unable to send email. Try again.' });
  const resend = useFormSubmit({ fallbackError: 'Unable to send email. Try again.' });
  const [linkError, setLinkError] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).has('error')
      ? 'This email link is invalid or expired. Request another email.'
      : null
  );
  const [message, setMessage] = useState<string | null>(null);
  // Latched open: a link error opens the form on arrival, and nothing closes it under the reader.
  const [expanded, setExpanded] = useState(linkError !== null);
  const busy = form.isPending || resend.isPending;
  const error = form.error ?? resend.error ?? linkError;

  const send =
    (verification: boolean, source = verification ? resend : form) =>
    async () => {
      // A fresh attempt replaces whatever the other button last reported.
      form.setError(null);
      resend.setError(null);
      setLinkError(null);
      setMessage(null);
      const address = email.trim();
      if (!isEmail(address)) {
        source.setError('Enter a valid email address.');
        return;
      }
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
    };

  return (
    <Collapsible className="mt-6 text-sm" onOpenChange={setExpanded} open={expanded}>
      <CollapsibleTrigger className="text-left font-medium">
        Forgot your password or need a verification email?
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <Form
          actions={
            <FormActions
              isPending={form.isPending}
              submitDisabled={resend.isPending || !email.trim()}
              submitLabel="Send password reset email"
            >
              <Button
                disabled={busy || !email.trim()}
                onClick={() => void resend.run(send(true))}
                pending={resend.isPending}
                type="button"
                variant="ghost"
              >
                Resend verification email
              </Button>
            </FormActions>
          }
          className="mt-4"
          error={error}
          isPending={busy}
          message={message}
          onSubmit={form.handle(send(false))}
        >
          <FormField label="Account email" required>
            <Input
              autoComplete="email"
              type="email"
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
        </Form>
      </CollapsibleContent>
    </Collapsible>
  );
}
