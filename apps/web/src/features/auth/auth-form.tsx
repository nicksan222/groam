import {
  MAX_USER_NAME_LENGTH,
  MAX_USERNAME_LENGTH
} from '@groam/backend/convex/modules/auth/lengths';
import { KeyRound } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import type { useAuthForm } from '@/features/auth/hooks/use-auth-form';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type AuthFormProps = Pick<
  ReturnType<typeof useAuthForm>,
  | 'isRecovery'
  | 'isSignIn'
  | 'signInWithPasskey'
  | 'state'
  | 'submit'
  | 'switchFlow'
  | 'switchToRecovery'
  | 'updateState'
>;

/** Whether every field the current step needs has something in it. */
function hasRequiredFields({
  isRecovery,
  isSignIn,
  state
}: Pick<AuthFormProps, 'isRecovery' | 'isSignIn' | 'state'>) {
  if (isRecovery) {
    return Boolean(state.identifier.trim() && state.recoveryCode.trim() && state.newPassword);
  }
  if (state.needsTwoFactor) return Boolean(state.twoFactorCode.trim());
  const credentials = Boolean(state.identifier.trim() && state.password);
  return isSignIn ? credentials : credentials && Boolean(state.name.trim() && state.email.trim());
}

export function AuthForm({
  isRecovery,
  isSignIn,
  signInWithPasskey,
  state,
  submit,
  switchFlow,
  switchToRecovery,
  updateState
}: AuthFormProps) {
  const form = useFormSubmit();
  const secondary =
    isSignIn && !state.needsTwoFactor ? (
      <>
        <Button
          className="w-full"
          disabled={state.isPending}
          onClick={() => void signInWithPasskey()}
          type="button"
          variant="outline"
        >
          <KeyRound /> Use a passkey
        </Button>
        <Button
          className="text-center text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
          data-testid={testIds.authRecoveryOpen}
          onClick={switchToRecovery}
          type="button"
          unstyled
        >
          Recover account with a saved code
        </Button>
      </>
    ) : null;

  return (
    <Form
      actions={
        <div className="flex flex-col gap-3">
          <FormActions
            fullWidth
            isPending={state.isPending}
            submitDisabled={!hasRequiredFields({ isRecovery, isSignIn, state })}
            submitLabel={isRecovery ? 'Reset password' : isSignIn ? 'Sign in' : 'Create account'}
            submitTestId={testIds.authSubmit}
          />
          {secondary}
          <p className="text-center text-sm text-muted-foreground">
            {isRecovery
              ? 'Remembered your password?'
              : isSignIn
                ? "Don't have an account?"
                : 'Already have an account?'}{' '}
            <Button
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              data-testid={testIds.authSwitchFlow}
              onClick={switchFlow}
              type="button"
              unstyled
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </Button>
          </p>
        </div>
      }
      className="gap-4 md:gap-6"
      density="relaxed"
      error={state.error ?? form.error}
      isPending={state.isPending}
      message={state.message}
      onSubmit={form.handle(submit)}
    >
      <AuthFields
        isRecovery={isRecovery}
        isSignIn={isSignIn}
        state={state}
        updateState={updateState}
      />
    </Form>
  );
}

function AuthFields({
  isRecovery,
  isSignIn,
  state,
  updateState
}: Pick<AuthFormProps, 'isRecovery' | 'isSignIn' | 'state' | 'updateState'>) {
  if (isRecovery) {
    return (
      <>
        <FormField label="Username" required>
          <Input
            autoCapitalize="none"
            autoComplete="username"
            autoFocus
            data-testid={testIds.authRecoveryUsername}
            disabled={state.isPending}
            onChange={(event) => updateState({ error: null, identifier: event.target.value })}
            value={state.identifier}
          />
        </FormField>
        <FormField label="Saved recovery code" required>
          <Input
            autoCapitalize="characters"
            autoComplete="off"
            data-testid={testIds.authRecoveryCode}
            disabled={state.isPending}
            onChange={(event) => updateState({ error: null, recoveryCode: event.target.value })}
            placeholder="e.g. XXXX-XXXX-XXXX-XXXX-XXXX"
            value={state.recoveryCode}
          />
        </FormField>
        <FormField description="Use at least 8 characters." label="New password" required>
          <Input
            autoComplete="new-password"
            data-testid={testIds.authRecoveryNewPassword}
            disabled={state.isPending}
            onChange={(event) => updateState({ error: null, newPassword: event.target.value })}
            type="password"
            value={state.newPassword}
          />
        </FormField>
      </>
    );
  }

  if (state.needsTwoFactor) {
    return (
      <FormField
        description="Use your authenticator app or one of your downloaded backup codes."
        label="Verification code"
        required
      >
        <Input
          autoComplete="one-time-code"
          autoFocus
          data-testid={testIds.authTwoFactorCode}
          disabled={state.isPending}
          onChange={(event) => updateState({ error: null, twoFactorCode: event.target.value })}
          placeholder="e.g. 123456"
          value={state.twoFactorCode}
        />
      </FormField>
    );
  }

  return (
    <>
      {!isSignIn ? (
        <FormField label="Name" required>
          <Input
            autoComplete="name"
            data-testid={testIds.authName}
            disabled={state.isPending}
            onChange={(event) => updateState({ error: null, name: event.target.value })}
            maxLength={MAX_USER_NAME_LENGTH}
            placeholder="e.g. Ada Lovelace"
            value={state.name}
          />
        </FormField>
      ) : null}
      {!isSignIn ? (
        <FormField label="Email" required>
          <Input
            autoComplete="email"
            data-testid={testIds.authSignupEmail}
            disabled={state.isPending}
            onChange={(event) => updateState({ error: null, email: event.target.value })}
            placeholder="e.g. you@example.com"
            type="email"
            value={state.email}
          />
        </FormField>
      ) : null}
      <FormField label={isSignIn ? 'Username or email' : 'Username'} required>
        <Input
          autoCapitalize="none"
          autoComplete="username"
          data-testid={testIds.authEmail}
          disabled={state.isPending}
          maxLength={isSignIn ? undefined : MAX_USERNAME_LENGTH}
          onChange={(event) => updateState({ error: null, identifier: event.target.value })}
          placeholder="e.g. ada"
          value={state.identifier}
        />
      </FormField>
      <FormField
        description={isSignIn ? undefined : 'Use at least 8 characters.'}
        label="Password"
        required
      >
        <Input
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
          data-testid={testIds.authPassword}
          disabled={state.isPending}
          onChange={(event) => updateState({ error: null, password: event.target.value })}
          type="password"
          value={state.password}
        />
      </FormField>
    </>
  );
}
