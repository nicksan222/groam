import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { PasskeySettings } from './passkey-settings';

const passkeys = vi.hoisted(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  state: {
    error: null as string | null,
    isLoading: false,
    passkeys: [] as Array<{ backedUp: boolean; id: string; name: string | null }>,
    pendingId: null as string | null
  }
}));

vi.mock('@/features/settings/hooks/use-passkey-settings', () => ({
  usePasskeySettings: () => ({ ...passkeys.state, add: passkeys.add, remove: passkeys.remove })
}));

beforeEach(() => {
  vi.clearAllMocks();
  passkeys.state = { error: null, isLoading: false, passkeys: [], pendingId: null };
});

describe('PasskeySettings', () => {
  test('shows a loading message while there are no passkeys yet', async () => {
    passkeys.state.isLoading = true;
    await render(<PasskeySettings />);
    await expect.element(page.getByText('Loading passkeys…')).toBeVisible();
  });

  test('shows the empty state', async () => {
    await render(<PasskeySettings />);
    await expect.element(page.getByText(/No passkeys yet/)).toBeVisible();
  });

  test('lists passkeys with a fallback name and backup status', async () => {
    passkeys.state.passkeys = [
      { backedUp: true, id: 'pk-1', name: 'Laptop' },
      { backedUp: false, id: 'pk-2', name: null }
    ];
    await render(<PasskeySettings />);
    await expect.element(page.getByText('Laptop')).toBeVisible();
    await expect.element(page.getByText('Synced or backed up')).toBeVisible();
    await expect.element(page.getByText('This device or security key')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Remove passkey' })).toBeVisible();
  });

  test('removes a passkey', async () => {
    passkeys.state.passkeys = [{ backedUp: true, id: 'pk-1', name: 'Laptop' }];
    await render(<PasskeySettings />);
    await page.getByRole('button', { name: 'Remove Laptop' }).click();
    expect(passkeys.remove).toHaveBeenCalledWith('pk-1');
  });

  test('adds a passkey with the typed name', async () => {
    await render(<PasskeySettings />);
    await page.getByTestId(testIds.settingsPasskeyName).fill('Phone');
    await page.getByTestId(testIds.settingsPasskeyAdd).click();
    expect(passkeys.add).toHaveBeenCalledWith('Phone');
  });

  test.each([
    ['removing one', 'pk-1'],
    ['adding', 'add']
  ])('disables controls while %s', async (_, pendingId) => {
    passkeys.state.passkeys = [{ backedUp: true, id: 'pk-1', name: 'Laptop' }];
    passkeys.state.pendingId = pendingId;
    await render(<PasskeySettings />);
    await expect.element(page.getByTestId(testIds.settingsPasskeyAdd)).toBeDisabled();
    await expect.element(page.getByTestId(testIds.settingsPasskeyName)).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Remove Laptop' })).toBeDisabled();
  });

  test('shows an error message', async () => {
    passkeys.state.error = 'Unable to load passkeys';
    await render(<PasskeySettings />);
    await expect.element(page.getByText('Unable to load passkeys')).toBeVisible();
  });
});
