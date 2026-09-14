import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import type { FormEvent } from 'react';
import type { useAuthForm } from '@/features/auth/hooks/use-auth-form';
import { testIds } from '@/lib/test-ids';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type AuthFormProps = Pick<
  ReturnType<typeof useAuthForm>,
  'isSignIn' | 'state' | 'submit' | 'switchFlow' | 'updateState'
>;

export function AuthForm({ isSignIn, state, submit, switchFlow, updateState }: AuthFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-7">
        <AuthFields isSignIn={isSignIn} state={state} updateState={updateState} />
        <div className="flex flex-col gap-3">
          <Button
            className="w-full font-medium"
            data-testid={testIds.authSubmit}
            disabled={state.isPending}
            type="submit"
          >
            {state.isPending ? <Spinner /> : null}
            {isSignIn ? 'Sign in' : 'Create account'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              data-testid={testIds.authSwitchFlow}
              onClick={switchFlow}
              type="button"
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </form>
  );
}

function AuthFields({
  isSignIn,
  state,
  updateState
}: Pick<AuthFormProps, 'isSignIn' | 'state' | 'updateState'>) {
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
      <FormField label="Email" required>
        <Input
          autoComplete="email"
          data-testid={testIds.authEmail}
          disabled={state.isPending}
          onChange={(event) => updateState({ email: event.target.value, error: null })}
          placeholder="m@example.com"
          required
          type="email"
          value={state.email}
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
