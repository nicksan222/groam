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

const emailDelivery = vi.hoisted(() => ({ value: true as boolean | undefined }));
vi.mock('@/features/auth/hooks/use-email-delivery', () => ({
  useEmailDelivery: () => emailDelivery.value
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

test('opens on an invalid link and stays open after the error clears', async () => {
  window.history.replaceState(null, '', `${window.location.pathname}?error=INVALID_TOKEN`);
  try {
    await render(<EmailLinkRequest />);
    const trigger = page.getByRole('button', {
      name: 'Forgot your password or need a verification email?'
    });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect
      .element(page.getByText('This email link is invalid or expired. Request another email.'))
      .toBeVisible();

    await page.getByLabelText(/^Account email/u).fill('person@example.com');
    await page.getByRole('button', { name: 'Send password reset email' }).click();
    await expect.element(page.getByRole('status')).toBeVisible();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');

    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  } finally {
    window.history.replaceState(null, '', window.location.pathname);
  }
});

test('offers no reset or verification email when the deployment cannot send email', async () => {
  emailDelivery.value = false;
  await render(<EmailLinkRequest />);
  await expect
    .element(page.getByText('Forgot your password or need a verification email?'))
    .not.toBeInTheDocument();
  emailDelivery.value = true;
});
