import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { AuthForm, type AuthFormProps } from './auth-form';

function makeProps(
  overrides: Partial<Omit<AuthFormProps, 'state'>> & {
    state?: Partial<AuthFormProps['state']>;
  } = {}
): AuthFormProps {
  const { state, ...rest } = overrides;
  return {
    isRecovery: false,
    isSignIn: true,
    signInWithPasskey: vi.fn(),
    submit: vi.fn(),
    switchFlow: vi.fn(),
    switchToRecovery: vi.fn(),
    updateState: vi.fn(),
    ...rest,
    state: {
      email: '',
      message: null,
      error: null,
      flow: 'signIn',
      identifier: '',
      isPending: false,
      name: '',
      needsTwoFactor: false,
      newPassword: '',
      password: '',
      recoveryCode: '',
      twoFactorCode: '',
      ...state
    }
  };
}

type Flow = NonNullable<Parameters<typeof makeProps>[0]>;

const signUp: Flow = { isSignIn: false, state: { flow: 'signUp' as const } };
const recovery: Flow = { isRecovery: true, isSignIn: false, state: { flow: 'recover' as const } };
const twoFactor: Flow = { state: { needsTwoFactor: true } };

describe('AuthForm flows', () => {
  test('sign-in shows username and password, a passkey and recovery option', async () => {
    await render(<AuthForm {...makeProps()} />);
    await expect.element(page.getByLabelText(/^Username or email/u)).toBeVisible();
    await expect.element(page.getByLabelText(/^Password/u)).toBeVisible();
    await expect.element(page.getByLabelText(/^Name/u)).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Use a passkey' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Recover account with a saved code' }))
      .toBeVisible();
    await expect.element(page.getByText(/Don't have an account\?/u)).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });

  test('sign-up shows the name field, hint and no passkey or recovery', async () => {
    await render(<AuthForm {...makeProps(signUp)} />);
    await expect.element(page.getByLabelText(/^Name/u)).toBeVisible();
    await expect.element(page.getByLabelText(/^Username/u)).toBeVisible();
    await expect.element(page.getByText('Use at least 8 characters.')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect.element(page.getByText(/Already have an account\?/u)).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Use a passkey' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Recover account with a saved code' }))
      .not.toBeInTheDocument();
  });

  test('recovery shows the recovery fields and a reset button', async () => {
    await render(<AuthForm {...makeProps(recovery)} />);
    await expect.element(page.getByLabelText(/^Username/u)).toBeVisible();
    await expect.element(page.getByLabelText(/^Saved recovery code/u)).toBeVisible();
    await expect.element(page.getByLabelText(/^New password/u)).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Reset password' })).toBeVisible();
    await expect.element(page.getByText(/Remembered your password\?/u)).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Use a passkey' }))
      .not.toBeInTheDocument();
  });

  test('two-factor shows only the verification code and hides alternatives', async () => {
    await render(<AuthForm {...makeProps(twoFactor)} />);
    await expect.element(page.getByLabelText(/^Verification code/u)).toBeVisible();
    await expect.element(page.getByLabelText(/^Password/u)).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Use a passkey' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Recover account with a saved code' }))
      .not.toBeInTheDocument();
  });
});

describe('AuthForm state', () => {
  test.each([
    ['sign-in', {}],
    ['sign-up', signUp],
    ['recovery', recovery],
    ['two-factor', twoFactor]
  ])('shows the error in the %s flow', async (_, flow) => {
    await render(
      <AuthForm
        {...makeProps({
          ...flow,
          state: { ...flow?.state, error: 'Something went wrong' }
        })}
      />
    );
    await expect.element(page.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  test('disables fields and actions while pending', async () => {
    await render(<AuthForm {...makeProps({ state: { isPending: true } })} />);
    await expect.element(page.getByLabelText(/^Username or email/u)).toBeDisabled();
    await expect.element(page.getByLabelText(/^Password/u)).toBeDisabled();
    await expect.element(page.getByTestId(testIds.authSubmit)).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Use a passkey' })).toBeDisabled();
  });

  test('shows the values held in state', async () => {
    await render(
      <AuthForm {...makeProps({ state: { identifier: 'lea', password: 'secret-pass' } })} />
    );
    await expect.element(page.getByLabelText(/^Username or email/u)).toHaveValue('lea');
    await expect.element(page.getByLabelText(/^Password/u)).toHaveValue('secret-pass');
  });
});

describe('AuthForm interactions', () => {
  test.each<{ flow: Flow; label: RegExp; name: string; patch: object; text: string }>([
    {
      flow: {},
      label: /^Username or email/u,
      name: 'sign-in identifier',
      patch: { error: null, identifier: 'l' },
      text: 'l'
    },
    {
      flow: {},
      label: /^Password/u,
      name: 'sign-in password',
      patch: { error: null, password: 'p' },
      text: 'p'
    },
    {
      flow: signUp,
      label: /^Name/u,
      name: 'sign-up name',
      patch: { error: null, name: 'N' },
      text: 'N'
    },
    {
      flow: recovery,
      label: /^Saved recovery code/u,
      name: 'recovery code',
      patch: { error: null, recoveryCode: 'A' },
      text: 'A'
    },
    {
      flow: recovery,
      label: /^New password/u,
      name: 'recovery new password',
      patch: { error: null, newPassword: 'x' },
      text: 'x'
    },
    {
      flow: twoFactor,
      label: /^Verification code/u,
      name: 'two-factor code',
      patch: { error: null, twoFactorCode: '1' },
      text: '1'
    }
  ])('typing into $name updates state', async ({ flow, label, patch, text }) => {
    const updateState = vi.fn();
    await render(<AuthForm {...makeProps({ ...flow, updateState })} />);
    await page.getByLabelText(label).fill(text);
    expect(updateState).toHaveBeenLastCalledWith(patch);
  });

  test('submitting the form calls submit', async () => {
    const submit = vi.fn();
    await render(<AuthForm {...makeProps({ submit })} />);
    await page.getByRole('button', { name: 'Sign in' }).click();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['Use a passkey', 'signInWithPasskey'],
    ['Recover account with a saved code', 'switchToRecovery'],
    ['Sign up', 'switchFlow']
  ] as const)('clicking "%s" calls %s', async (name, callback) => {
    const props = makeProps();
    await render(<AuthForm {...props} />);
    await page.getByRole('button', { name }).click();
    expect(props[callback]).toHaveBeenCalledTimes(1);
  });
});
