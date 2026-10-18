import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';
import { SecuritySettings } from './security-settings';

const password = vi.hoisted(() => ({
  save: vi.fn(),
  state: {
    confirmPassword: '',
    currentPassword: '',
    error: null as string | null,
    isPending: false,
    message: null as string | null,
    newPassword: ''
  },
  updateState: vi.fn()
}));

vi.mock('@/features/settings/hooks/use-password-settings', () => ({
  usePasswordSettings: () => password
}));
vi.mock('@/features/settings/settings-panels/passkey-settings', () => ({
  PasskeySettings: () => <div>passkey panel</div>
}));
vi.mock('@/features/settings/settings-panels/account-recovery-settings', () => ({
  AccountRecoverySettings: () => <div>recovery panel</div>
}));
vi.mock('@/features/settings/settings-panels/session-settings', () => ({
  SessionSettings: ({ currentToken }: { currentToken: string }) => (
    <div>sessions for {currentToken}</div>
  )
}));
vi.mock('./two-factor-settings', () => ({
  TwoFactorSettings: ({ enabled }: { enabled: boolean }) => <div>two factor {String(enabled)}</div>
}));

function makeSession(user: Record<string, unknown> = {}): Session {
  return {
    session: { token: 'tok-1' },
    user: { name: 'Ada Lovelace', twoFactorEnabled: false, ...user }
  } as unknown as Session;
}

beforeEach(() => {
  vi.clearAllMocks();
  password.state = {
    confirmPassword: '',
    currentPassword: '',
    error: null,
    isPending: false,
    message: null,
    newPassword: ''
  };
});

describe('SecuritySettings', () => {
  test('composes the child panels with session data', async () => {
    await render(<SecuritySettings session={makeSession({ twoFactorEnabled: true })} />);
    await expect.element(page.getByText('passkey panel')).toBeVisible();
    await expect.element(page.getByText('recovery panel')).toBeVisible();
    await expect.element(page.getByText('sessions for tok-1')).toBeVisible();
    await expect.element(page.getByText('two factor true')).toBeVisible();
  });

  test.each([
    ['a username', { username: 'ada' }, 'Signed in as @ada'],
    ['only a name', {}, 'Signed in as Ada Lovelace']
  ])('identifies the account by %s', async (_, user, text) => {
    await render(<SecuritySettings session={makeSession(user)} />);
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test('sends field edits to the password state', async () => {
    await render(<SecuritySettings session={makeSession()} />);
    await page.getByLabelText('Current password').fill('old');
    expect(password.updateState).toHaveBeenLastCalledWith({ currentPassword: 'old' });
    await page.getByLabelText('New password', { exact: true }).fill('newpass12');
    expect(password.updateState).toHaveBeenLastCalledWith({ newPassword: 'newpass12' });
    await page.getByLabelText('Confirm new password').fill('newpass12');
    expect(password.updateState).toHaveBeenLastCalledWith({ confirmPassword: 'newpass12' });
  });

  test.each([
    ['everything empty', {}, true],
    ['missing confirmation', { currentPassword: 'a', newPassword: 'b' }, true],
    [
      'pending',
      { confirmPassword: 'c', currentPassword: 'a', isPending: true, newPassword: 'b' },
      true
    ],
    [
      'all filled',
      { confirmPassword: 'longenough', currentPassword: 'a', newPassword: 'longenough' },
      false
    ]
  ])('update button with %s', async (_, patch, disabled) => {
    Object.assign(password.state, patch);
    await render(<SecuritySettings session={makeSession()} />);
    const button = page.getByRole('button', { name: /Update password/ });
    if (disabled) await expect.element(button).toBeDisabled();
    else await expect.element(button).toBeEnabled();
  });

  test('saves on submit', async () => {
    Object.assign(password.state, {
      confirmPassword: 'longenough',
      currentPassword: 'a',
      newPassword: 'longenough'
    });
    await render(<SecuritySettings session={makeSession()} />);
    await page.getByRole('button', { name: /Update password/ }).click();
    expect(password.save).toHaveBeenCalledTimes(1);
  });

  test('shows feedback messages', async () => {
    password.state.error = 'Wrong password';
    await render(<SecuritySettings session={makeSession()} />);
    await expect.element(page.getByText('Wrong password')).toBeVisible();
  });
});
