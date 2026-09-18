import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { KeyRound } from 'lucide-react';
import type { FormEvent } from 'react';
import type { useAuthForm } from '@/features/auth/hooks/use-auth-form';
import { testIds } from '@/lib/test-ids';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
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
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-7">
        <AuthFields
          isRecovery={isRecovery}
          isSignIn={isSignIn}
          state={state}
          updateState={updateState}
        />
        <div className="flex flex-col gap-3">
          <Button
            className="w-full font-medium"
            data-testid={testIds.authSubmit}
            disabled={state.isPending}
            type="submit"
          >
            {state.isPending ? <Spinner /> : null}
            {isRecovery ? 'Reset password' : isSignIn ? 'Sign in' : 'Create account'}
          </Button>
          {isSignIn && !state.needsTwoFactor ? (
            <Button
              className="w-full"
              disabled={state.isPending}
              onClick={() => void signInWithPasskey()}
              type="button"
              variant="outline"
            >
              <KeyRound /> Use a passkey
            </Button>
          ) : null}
          {isSignIn && !state.needsTwoFactor ? (
            <Button
              className="text-center text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
              data-testid={testIds.authRecoveryOpen}
              onClick={switchToRecovery}
              type="button"
              unstyled
            >
              Recover account with a saved code
            </Button>
          ) : null}
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
      </div>
    </form>
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
      <div className="flex flex-col gap-5">
        <FormField label="Username" required>
          <Input
            autoCapitalize="none"
            autoComplete="username"
            autoFocus
            data-testid={testIds.authRecoveryUsername}
            disabled={state.isPending}
            onChange={(event) => updateState({ error: null, identifier: event.target.value })}
            required
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
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            required
            value={state.recoveryCode}
          />
        </FormField>
        <FormField description="Use at least 8 characters." label="New password" required>
          <Input
            autoComplete="new-password"
            data-testid={testIds.authRecoveryNewPassword}
            disabled={state.isPending}
            minLength={8}
            onChange={(event) => updateState({ error: null, newPassword: event.target.value })}
            required
            type="password"
            value={state.newPassword}
          />
        </FormField>
        <FormFeedback error={state.error} />
      </div>
    );
  }

  if (state.needsTwoFactor) {
    return (
      <div className="flex flex-col gap-5">
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
            placeholder="123456 or backup code"
            required
            value={state.twoFactorCode}
          />
        </FormField>
        <FormFeedback error={state.error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!isSignIn ? (
        <FormField label="Name" required>
          <Input
            autoComplete="name"
            data-testid={testIds.authName}
            disabled={state.isPending}
            onChange={(event) => updateState({ error: null, name: event.target.value })}
            placeholder="Your name"
            required
            value={state.name}
          />
        </FormField>
      ) : null}
      <FormField label={isSignIn ? 'Username or email' : 'Username'} required>
        <Input
          autoCapitalize="none"
          autoComplete="username"
          data-testid={testIds.authEmail}
          disabled={state.isPending}
          maxLength={isSignIn ? undefined : 30}
          minLength={isSignIn ? undefined : 3}
          onChange={(event) => updateState({ error: null, identifier: event.target.value })}
          placeholder={isSignIn ? 'username' : 'choose-a-username'}
          required
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
          minLength={8}
          onChange={(event) => updateState({ error: null, password: event.target.value })}
          placeholder="Password"
          required
          type="password"
          value={state.password}
        />
      </FormField>
      <FormFeedback error={state.error} />
    </div>
  );
}
