import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { EmailSettings } from './email-settings';

const { save, setEmail } = vi.hoisted(() => ({ save: vi.fn(), setEmail: vi.fn() }));
vi.mock('@/features/settings/hooks/use-email-settings', () => ({
  useEmailSettings: () => ({
    save,
    setEmail,
    state: {
      email: 'real@example.com',
      error: null,
      isConfirming: false,
      isPending: false,
      message: null
    }
  })
}));

const emailDelivery = vi.hoisted(() => ({ value: true as boolean | undefined }));
vi.mock('@/features/auth/hooks/use-email-delivery', () => ({
  useEmailDelivery: () => emailDelivery.value
}));

test('shows the current address and offers verified replacement without changing the displayed account', async () => {
  await render(<EmailSettings email="current@example.com" />);
  await expect.element(page.getByText('Current address: current@example.com')).toBeVisible();
  await page.getByLabelText(/^New email address/u).fill('new@example.com');
  expect(setEmail).toHaveBeenCalledWith('new@example.com');
  await page.getByRole('button', { name: 'Verify new email' }).click();
  expect(save).toHaveBeenCalled();
});

test('does not show a placeholder address as the current email', async () => {
  await render(<EmailSettings email="legacy@users.invalid" />);
  await expect.element(page.getByText('No email on file')).toBeVisible();
});

test('explains that email change is unavailable when the deployment cannot send email', async () => {
  emailDelivery.value = false;
  await render(<EmailSettings email="current@example.com" />);
  await expect.element(page.getByText(/cannot send email/u)).toBeVisible();
  await expect.element(page.getByLabelText(/^New email address/u)).not.toBeInTheDocument();
  emailDelivery.value = true;
});
