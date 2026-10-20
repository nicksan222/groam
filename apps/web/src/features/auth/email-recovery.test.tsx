import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { EmailRecovery } from './email-recovery';

const { requestPasswordReset, resetPassword, sendVerificationEmail } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  sendVerificationEmail: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    requestPasswordReset,
    resetPassword,
    sendVerificationEmail
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  requestPasswordReset.mockResolvedValue({ data: { status: true }, error: null });
  sendVerificationEmail.mockResolvedValue({ data: { status: true }, error: null });
  resetPassword.mockResolvedValue({ data: { status: true }, error: null });
});

test('requests reset and verification links with generic account-existence feedback', async () => {
  await render(<EmailRecovery token={null} />);
  await page.getByText('Forgot your password or need a verification email?').click();
  await page.getByLabelText(/^Account email/u).fill('person@example.com');
  await page.getByRole('button', { name: 'Send password reset email' }).click();
  await vi.waitFor(() =>
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: 'person@example.com',
      redirectTo: window.location.origin + window.location.pathname
    })
  );
  await expect
    .element(page.getByRole('status'))
    .toHaveTextContent(
      'If this address is eligible, an email is on its way. Check your inbox and spam folder.'
    );
  await page.getByRole('button', { name: 'Resend verification email' }).click();
  await vi.waitFor(() =>
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      email: 'person@example.com',
      callbackURL: window.location.origin + window.location.pathname
    })
  );
});

test('surfaces invalid reset tokens and keeps the new password form available', async () => {
  resetPassword.mockResolvedValue({ data: null, error: { message: 'Invalid token' } });
  await render(<EmailRecovery token="invalid-token" />);
  await page.getByLabelText(/^New password/u).fill('Changed-password-1234');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('Invalid token');
  expect(resetPassword).toHaveBeenCalledWith({
    token: 'invalid-token',
    newPassword: 'Changed-password-1234'
  });
});
