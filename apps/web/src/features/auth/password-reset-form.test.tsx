import { act, render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PasswordResetForm } from './password-reset-form';

const { resetPassword } = vi.hoisted(() => ({ resetPassword: vi.fn() }));

vi.mock('@groam/auth/client', () => ({ authClient: { resetPassword } }));

beforeEach(() => {
  vi.clearAllMocks();
  resetPassword.mockResolvedValue({ data: { status: true }, error: null });
});

test('surfaces invalid reset tokens and keeps the new password form available', async () => {
  resetPassword.mockResolvedValue({ data: null, error: { message: 'Invalid token' } });
  await render(<PasswordResetForm token="invalid-token" />);
  await page.getByLabelText(/^New password/u).fill('Changed-password-1234');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('Invalid token');
  expect(resetPassword).toHaveBeenCalledWith({
    token: 'invalid-token',
    newPassword: 'Changed-password-1234'
  });
});

test('ignores duplicate reset submissions until the active request settles', async () => {
  let finish: (value: unknown) => void = () => undefined;
  resetPassword.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  await render(<PasswordResetForm token="single-reset" />);
  await page.getByLabelText(/^New password/u).fill('Changed-password-1234');
  const form = page
    .getByLabelText(/^New password/u)
    .element()
    .closest('form');
  await act(() => {
    form?.requestSubmit();
    form?.requestSubmit();
  });
  expect(resetPassword).toHaveBeenCalledTimes(1);
  await expect.element(page.getByRole('button', { name: 'Reset password' })).toBeDisabled();
  await act(() => finish({ data: null, error: { message: 'Expired link' } }));
  await expect.element(page.getByRole('alert')).toHaveTextContent('Expired link');
  await expect.element(page.getByRole('button', { name: 'Reset password' })).toBeEnabled();
});
