import { authClient } from '@groam/auth/client';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
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
  const form = useFormSubmit();
  const [completed, setCompleted] = useState(false);
  const callbackURL = emailCallbackURL();

  const reset = async () => {
    const failure = await resetPassword(password, token);
    if (failure) {
      form.setError(failure);
      return;
    }
    setCompleted(true);
    setPassword('');
    window.history.replaceState(null, '', callbackURL);
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
    <Form
      actions={
        <FormActions
          isPending={form.isPending}
          submitDisabled={!password}
          submitLabel="Reset password"
        />
      }
      error={form.error}
      isPending={form.isPending}
      onSubmit={form.handle(reset)}
    >
      <FormField label="New password" required description="Use between 8 and 128 characters.">
        <Input
          autoComplete="new-password"
          type="password"
          value={password}
          disabled={form.isPending}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>
    </Form>
  );
}
