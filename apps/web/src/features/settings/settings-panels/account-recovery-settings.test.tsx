import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AccountRecoverySettings } from './account-recovery-settings';

const recovery = vi.hoisted(() => ({
  error: null as string | null,
  generate: vi.fn(),
  isPending: false,
  message: null as string | null
}));

vi.mock('@/features/settings/hooks/use-account-recovery-settings', () => ({
  useAccountRecoverySettings: () => recovery
}));

beforeEach(() => {
  vi.clearAllMocks();
  recovery.error = null;
  recovery.isPending = false;
  recovery.message = null;
});

test('requires the current password before generating recovery codes', async () => {
  await render(<AccountRecoverySettings />);
  const generate = page.getByRole('button', { name: 'Generate and download' });

  await expect.element(generate).toBeDisabled();
  await page.getByLabelText('Current password').fill('current-password');
  await expect.element(generate).toBeEnabled();

  await generate.click();
  expect(recovery.generate).toHaveBeenCalledWith('current-password');
});

test('renders recovery errors as an accessible alert', async () => {
  recovery.error = 'Invalid password';

  await render(<AccountRecoverySettings />);

  await expect.element(page.getByRole('alert')).toHaveTextContent('Invalid password');
});
