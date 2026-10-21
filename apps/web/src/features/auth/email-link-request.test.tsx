import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { EmailLinkRequest } from './email-link-request';

const { requestPasswordReset, sendVerificationEmail } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  sendVerificationEmail: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: { requestPasswordReset, sendVerificationEmail }
}));

beforeEach(() => {
  vi.clearAllMocks();
  requestPasswordReset.mockResolvedValue({ data: { status: true }, error: null });
  sendVerificationEmail.mockResolvedValue({ data: { status: true }, error: null });
});

test('requests reset and verification links with generic account-existence feedback', async () => {
  await render(<EmailLinkRequest />);
  await page.getByText('Forgot your password or need a verification email?').click();
  await page.getByLabelText(/^Account email/u).fill('person@example.com');
  await page.getByRole('button', { name: 'Send password reset email' }).click();
  await vi.waitFor(() =>
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: 'person@example.com',
      redirectTo: window.location.origin + window.location.pathname + '?auth=reset-password'
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
