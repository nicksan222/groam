import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
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

afterEach(cleanup);

test('requires the current password before generating recovery codes', () => {
  render(<AccountRecoverySettings />);
  const generate = screen.getByRole('button', { name: 'Generate and download' });

  expect(generate.hasAttribute('disabled')).toBe(true);
  fireEvent.change(screen.getByLabelText('Current password'), {
    target: { value: 'current-password' }
  });
  expect(generate.hasAttribute('disabled')).toBe(false);

  fireEvent.click(generate);
  expect(recovery.generate).toHaveBeenCalledWith('current-password');
});

test('renders recovery errors as an accessible alert', () => {
  recovery.error = 'Invalid password';

  render(<AccountRecoverySettings />);

  expect(screen.getByRole('alert').textContent).toBe('Invalid password');
});
