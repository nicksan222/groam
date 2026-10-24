import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { TwoFactorSettings } from './two-factor-settings';

const twoFactor = vi.hoisted(() => ({
  confirmEnrollment: vi.fn(),
  disable: vi.fn(),
  download: vi.fn(),
  regenerate: vi.fn(),
  startEnrollment: vi.fn(),
  state: {
    enrollment: null as null | { backupCodes: string[]; totpURI: string },
    error: null as string | null,
    isEnabled: false,
    isPending: false,
    message: null as string | null
  }
}));

vi.mock('@/features/settings/hooks/use-two-factor-settings', () => ({
  downloadBackupCodes: twoFactor.download,
  useTwoFactorSettings: () => ({
    confirmEnrollment: twoFactor.confirmEnrollment,
    disable: twoFactor.disable,
    regenerate: twoFactor.regenerate,
    startEnrollment: twoFactor.startEnrollment,
    ...twoFactor.state
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
  twoFactor.state = {
    enrollment: null,
    error: null,
    isEnabled: false,
    isPending: false,
    message: null
  };
});

describe('TwoFactorSettings', () => {
  test('disabled: setup needs a password', async () => {
    await render(<TwoFactorSettings enabled={false} />);
    await expect.element(page.getByText('Disabled')).toBeVisible();
    const start = page.getByTestId(testIds.settingsTwoFactorStart);
    await expect.element(start).toBeDisabled();
    await page.getByTestId(testIds.settingsTwoFactorPassword).fill('secret');
    await expect.element(start).toBeEnabled();
    await start.click();
    expect(twoFactor.startEnrollment).toHaveBeenCalledWith('secret');
  });

  test('enabled: regenerate and disable use the typed password', async () => {
    twoFactor.state.isEnabled = true;
    await render(<TwoFactorSettings enabled />);
    await expect.element(page.getByText('Enabled')).toBeVisible();
    const regenerate = page.getByRole('button', { name: 'Regenerate codes' });
    const disable = page.getByRole('button', { name: 'Disable 2FA' });
    await expect.element(regenerate).toBeDisabled();
    await expect.element(disable).toBeDisabled();
    await page.getByTestId(testIds.settingsTwoFactorPassword).fill('secret');
    await regenerate.click();
    expect(twoFactor.regenerate).toHaveBeenCalledWith('secret');
    await disable.click();
    expect(twoFactor.disable).toHaveBeenCalledWith('secret');
  });

  test('enabled: Enter in the password field neither regenerates nor disables', async () => {
    twoFactor.state.isEnabled = true;
    await render(<TwoFactorSettings enabled />);
    await page.getByTestId(testIds.settingsTwoFactorPassword).fill('secret');
    await userEvent.keyboard('{Enter}');
    expect(twoFactor.regenerate).not.toHaveBeenCalled();
    expect(twoFactor.disable).not.toHaveBeenCalled();
  });

  test('pending disables the password field and actions', async () => {
    twoFactor.state.isPending = true;
    await render(<TwoFactorSettings enabled={false} />);
    await expect.element(page.getByTestId(testIds.settingsTwoFactorPassword)).toBeDisabled();
    await expect.element(page.getByTestId(testIds.settingsTwoFactorStart)).toBeDisabled();
  });

  describe('enrollment', () => {
    beforeEach(() => {
      twoFactor.state.enrollment = {
        backupCodes: ['code-1', 'code-2'],
        totpURI: 'otpauth://totp/Groam:ada?secret=ABC'
      };
    });

    test('shows the QR code and URI instead of the password field', async () => {
      await render(<TwoFactorSettings enabled={false} />);
      await expect
        .element(page.getByTestId(testIds.settingsTwoFactorUri))
        .toHaveTextContent('otpauth://totp/Groam:ada?secret=ABC');
      await expect.element(page.getByAltText('Authenticator setup QR code')).toBeVisible();
      await expect
        .element(page.getByTestId(testIds.settingsTwoFactorPassword))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByTestId(testIds.settingsTwoFactorStart))
        .not.toBeInTheDocument();
    });

    test('downloads the backup codes', async () => {
      await render(<TwoFactorSettings enabled={false} />);
      await page.getByTestId(testIds.settingsTwoFactorDownload).click();
      expect(twoFactor.download).toHaveBeenCalledWith(['code-1', 'code-2']);
    });

    test('confirms with the typed code once one is entered', async () => {
      await render(<TwoFactorSettings enabled={false} />);
      const confirm = page.getByTestId(testIds.settingsTwoFactorConfirm);
      await expect.element(confirm).toBeDisabled();
      await page.getByTestId(testIds.settingsTwoFactorCode).fill('123456');
      await confirm.click();
      expect(twoFactor.confirmEnrollment).toHaveBeenCalledWith('123456');
    });
  });

  test.each([
    ['error', { error: 'Invalid password' }, 'Invalid password'],
    ['message', { message: 'Backup codes regenerated' }, 'Backup codes regenerated']
  ])('shows the %s feedback', async (_, patch, text) => {
    Object.assign(twoFactor.state, patch);
    await render(<TwoFactorSettings enabled={false} />);
    await expect.element(page.getByText(text)).toBeVisible();
  });
});
