import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useTwoFactorSettings } from './use-two-factor-settings';

const auth = vi.hoisted(() => ({
  disable: vi.fn(),
  enable: vi.fn(),
  generateBackupCodes: vi.fn(),
  verifyTotp: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({ authClient: { twoFactor: auth } }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.disable.mockResolvedValue({ data: {}, error: null });
  auth.enable.mockResolvedValue({
    data: { backupCodes: ['backup-code'], totpURI: 'otpauth://totp/Groam' },
    error: null
  });
  auth.generateBackupCodes.mockResolvedValue({
    data: { backupCodes: ['new-backup-code'] },
    error: null
  });
  auth.verifyTotp.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useTwoFactorSettings', () => {
  test('enrolls and confirms an authenticator', async () => {
    const { result } = renderHook(() => useTwoFactorSettings(false));

    await act(() => result.current.startEnrollment('current-password'));
    expect(auth.enable).toHaveBeenCalledWith({ password: 'current-password' });
    expect(result.current.enrollment?.totpURI).toBe('otpauth://totp/Groam');

    await act(() => result.current.confirmEnrollment(' 123456 '));
    expect(auth.verifyTotp).toHaveBeenCalledWith({ code: '123456', trustDevice: true });
    expect(result.current).toMatchObject({ error: null, isEnabled: true, isPending: false });
  });

  test('regenerates and downloads backup codes', async () => {
    const createObjectURL = vi.fn(() => 'blob:backup-codes');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { result } = renderHook(() => useTwoFactorSettings(true));

    await act(() => result.current.regenerate('current-password'));

    expect(auth.generateBackupCodes).toHaveBeenCalledWith({ password: 'current-password' });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(result.current.message).toBe(
      'New backup codes downloaded. Previous codes no longer work.'
    );
  });

  test('disables two-factor authentication', async () => {
    const { result } = renderHook(() => useTwoFactorSettings(true));

    await act(() => result.current.disable('current-password'));

    expect(auth.disable).toHaveBeenCalledWith({ password: 'current-password' });
    expect(result.current).toMatchObject({
      enrollment: null,
      error: null,
      isEnabled: false,
      isPending: false
    });
  });

  test('surfaces provider errors', async () => {
    auth.enable.mockResolvedValue({ data: null, error: { message: 'Invalid password' } });
    const { result } = renderHook(() => useTwoFactorSettings(false));

    await act(() => result.current.startEnrollment('wrong-password'));

    expect(result.current).toMatchObject({ error: 'Invalid password', isPending: false });
  });

  test('keeps two-factor disabled when authenticator confirmation fails', async () => {
    auth.verifyTotp.mockResolvedValue({ data: null, error: { message: 'Invalid code' } });
    const { result } = renderHook(() => useTwoFactorSettings(false));

    await act(() => result.current.startEnrollment('current-password'));
    await act(() => result.current.confirmEnrollment('invalid-code'));

    expect(result.current).toMatchObject({
      error: 'Invalid code',
      isEnabled: false,
      isPending: false,
      message: null
    });
  });
});
