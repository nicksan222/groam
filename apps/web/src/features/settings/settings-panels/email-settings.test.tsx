import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { EmailSettings } from './email-settings';

const { save, setEmail } = vi.hoisted(() => ({ save: vi.fn(), setEmail: vi.fn() }));
vi.mock('@/features/settings/hooks/use-email-settings', () => ({
  useEmailSettings: () => ({
    save,
    setEmail,
    state: { email: 'real@example.com', error: null, message: null, pending: false }
  })
}));

test('shows the current address and offers verified replacement without changing the displayed account', async () => {
  await render(<EmailSettings email="current@example.com" />);
  await expect.element(page.getByText('Current address: current@example.com')).toBeVisible();
  await page.getByLabelText(/^New email address/u).fill('new@example.com');
  expect(setEmail).toHaveBeenCalledWith('new@example.com');
  await page.getByRole('button', { name: 'Verify new email' }).click();
  expect(save).toHaveBeenCalled();
});
